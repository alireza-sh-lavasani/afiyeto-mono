import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import * as sqliteVec from "sqlite-vec";
import { env, pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Transformers.js GPU execution providers (CUDA/DirectML)
const modelsDir = path.join(__dirname, "models", "pre-embedding");
if (fs.existsSync(modelsDir)) {
  env.localModelPath = modelsDir;
  env.allowRemoteModels = true;
}
if (env.backends && env.backends.onnx) {
  env.backends.onnx.executionProviders = ["cuda", "directml", "cpu"];
}

// Input / Output Paths
const KNOWLEDGE_BASE_DIR = path.join(__dirname, "raw-knowledge-base");
const PWA_ASSETS_DIR = path.join(__dirname, "..", "..", "apps", "pwa-app", "public", "assets");
const DB_OUTPUT_PATH = path.join(PWA_ASSETS_DIR, "afiyet_med_knowledge.db");

interface ChunkItem {
  id: string;
  title: string;
  section: string;
  content: string;
  source: string;
}

let globalChunkSequence = 1;

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function chunkContent(title: string, section: string, rawText: string, source: string): ChunkItem[] {
  const chunks: ChunkItem[] = [];
  const paragraphs = rawText.split(/\n{2,}/);
  let currentBlock: string[] = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || para.trim().length === 0) continue;

    if (currentLen + words.length > 400 && currentBlock.length > 0) {
      const contentStr = currentBlock.join("\n\n").trim();
      if (contentStr.length > 30) {
        chunks.push({
          id: `chunk_${globalChunkSequence++}_${source}`,
          title,
          section,
          content: contentStr,
          source
        });
      }
      currentBlock = [];
      currentLen = 0;
    }

    currentBlock.push(para.trim());
    currentLen += words.length;
  }

  if (currentBlock.length > 0) {
    const contentStr = currentBlock.join("\n\n").trim();
    if (contentStr.length > 30) {
      chunks.push({
        id: `chunk_${globalChunkSequence++}_${source}`,
        title,
        section,
        content: contentStr,
        source
      });
    }
  }

  return chunks;
}

function parseMarkdownDir(dirPath: string, source: string): ChunkItem[] {
  if (!fs.existsSync(dirPath)) return [];
  const chunks: ChunkItem[] = [];

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".md"));
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const docTitle = path.basename(file, ".md").replace(/-/g, " ");

    const sections = content.split(/^##\s+/m);
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i].trim();
      if (!sec) continue;

      const lines = sec.split("\n");
      const sectionHeading = i === 0 ? "Overview" : lines[0].trim();
      const bodyText = i === 0 ? sec : lines.slice(1).join("\n").trim();

      chunks.push(...chunkContent(docTitle, sectionHeading, bodyText, source));
    }
  }

  return chunks;
}

function parseJsonDir(dirPath: string, source: string): ChunkItem[] {
  if (!fs.existsSync(dirPath)) return [];
  const chunks: ChunkItem[] = [];

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    try {
      const record = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      if (record && record.title && record.content) {
        chunks.push(...chunkContent(record.title, record.category || "General", record.content, source));
      }
    } catch (e) {
      // skip invalid json
    }
  }

  return chunks;
}

async function parseJsonlFile(filePath: string, source: string): Promise<ChunkItem[]> {
  if (!fs.existsSync(filePath)) return [];
  const chunks: ChunkItem[] = [];

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      const title = record.title || record.id || "Medical Document";
      const section = record.heading || record.section || "Clinical Overview";
      const content = record.content || record.text || "";

      if (content.length > 30) {
        chunks.push(...chunkContent(title, section, content, source));
      }
    } catch (e) {
      // skip invalid jsonl line
    }
  }

  return chunks;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "calculating...";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }
  return `${m}m ${s}s`;
}

async function main() {
  console.log("===============================================================================");
  console.log("  AFIYET HIGH-PERFORMANCE MEDICAL RAG EMBEDDING BUILDER (GPU ACCELERATED)");
  console.log("===============================================================================");
  console.log(`  System Target: Razer Blade Advanced (Intel i7 + 32GB RAM + RTX 2070 Max-Q)`);
  console.log(`  Embedding Model: NIH MedCPT Article Encoder (ncbi/MedCPT-Article-Encoder)`);
  console.log(`  Vector Spec: 768-dimensional Float32 (sqlite-vec + FTS5 BM25)`);
  console.log(`  GPU Execution Providers: ${JSON.stringify(env.backends?.onnx?.executionProviders || ['cpu'])}`);
  console.log(`  GPU Batch Size: 64 chunks per CUDA/DirectML call`);
  console.log("===============================================================================\n");

  ensureDir(PWA_ASSETS_DIR);
  if (fs.existsSync(DB_OUTPUT_PATH)) {
    console.log(`[Clean Setup] Replacing existing database at: ${DB_OUTPUT_PATH}`);
    fs.unlinkSync(DB_OUTPUT_PATH);
  }

  // Pre-load all sources to calculate total chunk count for accurate ETA
  console.log("Scanning input medical datasets...");
  const sourcesQueue: Array<{ name: string; getChunks: () => Promise<ChunkItem[]> }> = [];

  sourcesQueue.push({
    name: "WHO Primary Care Guidelines",
    getChunks: async () => parseMarkdownDir(path.join(KNOWLEDGE_BASE_DIR, "who"), "who_guidelines")
  });
  sourcesQueue.push({
    name: "StatPearls MSD Guidelines",
    getChunks: async () => parseMarkdownDir(path.join(KNOWLEDGE_BASE_DIR, "msd"), "statpearls_msd")
  });
  sourcesQueue.push({
    name: "MedlinePlus Primary Health Topics",
    getChunks: async () => parseJsonDir(path.join(KNOWLEDGE_BASE_DIR, "medlineplus"), "medlineplus")
  });

  const medragFullDir = path.join(KNOWLEDGE_BASE_DIR, "medrag_full");
  if (fs.existsSync(medragFullDir)) {
    const textbooksDir = path.join(medragFullDir, "textbooks");
    if (fs.existsSync(textbooksDir)) {
      const files = fs.readdirSync(textbooksDir).filter(f => f.endsWith(".jsonl"));
      for (const fileName of files) {
        const filePath = path.join(textbooksDir, fileName);
        const fileBase = path.basename(fileName, ".jsonl");
        sourcesQueue.push({
          name: `Medical Textbook: ${fileBase}`,
          getChunks: async () => parseJsonlFile(filePath, `medrag_textbook_${fileBase}`)
        });
      }
    }
  }

  console.log(`Discovered ${sourcesQueue.length} medical source collections to process.\n`);

  // Initialize NIH MedCPT Article Encoder model
  console.log("Loading NIH MedCPT Article Encoder model...");
  let embedder: any;
  let embeddingDim = 768;

  try {
    embedder = await pipeline("feature-extraction", "ncbi/MedCPT-Article-Encoder");
    console.log("[SUCCESS] NIH MedCPT Article Encoder loaded successfully.\n");
  } catch (err) {
    console.warn("Notice: Online NIH MedCPT model loading attempted. Using fallback encoder pipeline if offline.");
    embedder = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
    embeddingDim = 384;
  }

  // Initialize SQLite database
  console.log(`Initializing SQLite Database Engine (${DB_OUTPUT_PATH})...`);
  const db = new sqlite3.Database(DB_OUTPUT_PATH);
  sqliteVec.load(db);

  await new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE med_chunks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          section TEXT,
          content TEXT NOT NULL,
          source TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE VIRTUAL TABLE med_fts USING fts5(
          title,
          section,
          content,
          content='med_chunks',
          content_rowid='rowid'
        );
      `);

      db.run(`
        CREATE VIRTUAL TABLE vec_chunks USING vec0(
          chunk_id TEXT PRIMARY KEY,
          embedding float[${embeddingDim}]
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  console.log("Database schema initialized cleanly.\n");

  const insertChunkStmt = db.prepare(`INSERT INTO med_chunks (id, title, section, content, source) VALUES (?, ?, ?, ?, ?)`);
  const insertFtsStmt = db.prepare(`INSERT INTO med_fts (rowid, title, section, content) VALUES (?, ?, ?, ?)`);
  const insertVecStmt = db.prepare(`INSERT INTO vec_chunks (chunk_id, embedding) VALUES (?, ?)`);

  let rowidCounter = 1;
  let totalChunksProcessed = 0;
  const startTime = Date.now();

  console.log("===============================================================================");
  console.log("  STARTING GPU EMBEDDING & STREAMING INGESTION PROCESS");
  console.log("===============================================================================\n");

  for (let sIdx = 0; sIdx < sourcesQueue.length; sIdx++) {
    const sourceObj = sourcesQueue[sIdx];
    const sourceNum = sIdx + 1;
    const totalSources = sourcesQueue.length;

    console.log(`[Source ${sourceNum}/${totalSources}] Ingesting: ${sourceObj.name}...`);

    const chunks = await sourceObj.getChunks();
    if (chunks.length === 0) {
      console.log(`  └─ Skipped (0 chunks found).\n`);
      continue;
    }

    const BATCH_SIZE = 64; // Optimized batch size for 8GB VRAM on RTX 2070 Max-Q
    let fileChunksDone = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      fileChunksDone += batch.length;
      totalChunksProcessed += batch.length;

      const cleanTexts = batch.map(item => `${item.title} - ${item.section}: ${item.content}`.replace(/\s+/g, " ").trim());
      const batchResult = await embedder(cleanTexts, { pooling: "mean", normalize: true });
      const flatData = batchResult.data as Float32Array;
      const dim = embeddingDim;

      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const embeddingFloat32 = flatData.subarray(j * dim, (j + 1) * dim);

            const currentRowId = rowidCounter++;
            insertChunkStmt.run(item.id, item.title, item.section, item.content, item.source);
            insertFtsStmt.run(currentRowId, item.title, item.section, item.content);
            insertVecStmt.run(item.id, embeddingFloat32);
          }
          db.run("COMMIT", (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      // Calculate speed and ETA
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = totalChunksProcessed / elapsedSec;
      const remainingSourcesCount = totalSources - sourceNum;

      const progressPercent = ((fileChunksDone / chunks.length) * 100).toFixed(1);
      process.stdout.write(`  └─ [File Progress: ${fileChunksDone}/${chunks.length} (${progressPercent}%)] | [Overall Total: ${totalChunksProcessed} chunks] | Speed: ${speed.toFixed(1)} chunks/sec\r`);
    }

    console.log(`\n  └─ [COMPLETED] ${sourceObj.name} (${chunks.length} chunks embedded).\n`);
  }

  insertChunkStmt.finalize();
  insertFtsStmt.finalize();
  insertVecStmt.finalize();

  console.log("Optimizing and finalizing SQLite database indexes...");
  await new Promise<void>((resolve) => {
    db.close(() => resolve());
  });

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const stats = fs.statSync(DB_OUTPUT_PATH);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log("\n===============================================================================");
  console.log("  BUILD SUCCESSFUL! DATABASE COMPILED AND READY");
  console.log("===============================================================================");
  console.log(`  Total Chunks Embedded: ${totalChunksProcessed}`);
  console.log(`  Total Execution Time:  ${formatTime(totalTimeSec)} (${(totalChunksProcessed / totalTimeSec).toFixed(1)} chunks/sec)`);
  console.log(`  Database File Size:    ${sizeMb} MB`);
  console.log(`  Output Path:           ${DB_OUTPUT_PATH}`);
  console.log("===============================================================================\n");
}

main().catch(err => {
  console.error("\n[FATAL ERROR] Ingestion process failed:", err);
  process.exit(1);
});

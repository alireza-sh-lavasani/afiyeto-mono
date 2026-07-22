import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import * as sqliteVec from "sqlite-vec";
import { env, pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Transformers.js offline path
const modelsDir = path.join(__dirname, "models", "pre-embedding");
if (fs.existsSync(modelsDir)) {
  env.localModelPath = modelsDir;
  env.allowRemoteModels = false;
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
  let chunkIdx = 1;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || para.trim().length === 0) continue;

    if (currentLen + words.length > 400 && currentBlock.length > 0) {
      const contentStr = currentBlock.join("\n\n").trim();
      if (contentStr.length > 30) {
        chunks.push({
          id: `${source}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${chunkIdx++}`,
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
        id: `${source}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${chunkIdx++}`,
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

async function main() {
  console.log("=== Afiyet MedRAG 4-Corpus Knowledge Base Compiler (sqlite-vec + FTS5) ===");

  ensureDir(PWA_ASSETS_DIR);
  if (fs.existsSync(DB_OUTPUT_PATH)) {
    fs.unlinkSync(DB_OUTPUT_PATH);
  }

  const allChunks: ChunkItem[] = [];
  allChunks.push(...parseMarkdownDir(path.join(KNOWLEDGE_BASE_DIR, "who"), "who_guidelines"));
  allChunks.push(...parseMarkdownDir(path.join(KNOWLEDGE_BASE_DIR, "msd"), "statpearls_msd"));
  allChunks.push(...parseJsonDir(path.join(KNOWLEDGE_BASE_DIR, "medlineplus"), "medlineplus"));

  // Check for full MedRAG datasets (MedCorp: StatPearls, Textbooks, Wikipedia, PubMed)
  const medragFullDir = path.join(KNOWLEDGE_BASE_DIR, "medrag_full");
  if (fs.existsSync(medragFullDir)) {
    const corpora = [
      { file: "statpearls.jsonl", source: "statpearls_full", label: "StatPearls (~9,200 Clinical Articles)" },
      { file: "textbooks.jsonl", source: "textbooks_full", label: "Medical Textbooks (18 USMLE Textbooks)" },
      { file: "wikipedia.jsonl", source: "wikipedia_full", label: "Wikipedia Medical Articles" },
      { file: "pubmed.jsonl", source: "pubmed_full", label: "PubMed Biomedical Abstracts" }
    ];

    for (const c of corpora) {
      const targetPath = path.join(medragFullDir, c.file);
      if (fs.existsSync(targetPath)) {
        console.log(`Parsing MedRAG corpus: ${c.label}...`);
        allChunks.push(...(await parseJsonlFile(targetPath, c.source)));
      }
    }
  }

  console.log(`Parsed total of ${allChunks.length} clinical chunks.`);

  // Initialize ONNX embedding model
  console.log("Initializing local embedding extractor (all-MiniLM-L6-v2)...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  // Initialize SQLite database
  console.log(`Creating SQLite database at: ${DB_OUTPUT_PATH}`);
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
          embedding float[384]
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  console.log("Database tables created cleanly. Generating embeddings & populating SQLite database...");

  const insertChunkStmt = db.prepare(`INSERT INTO med_chunks (id, title, section, content, source) VALUES (?, ?, ?, ?, ?)`);
  const insertFtsStmt = db.prepare(`INSERT INTO med_fts (rowid, title, section, content) VALUES (?, ?, ?, ?)`);
  const insertVecStmt = db.prepare(`INSERT INTO vec_chunks (chunk_id, embedding) VALUES (?, ?)`);

  let rowidCounter = 1;
  for (let i = 0; i < allChunks.length; i++) {
    const item = allChunks[i];
    if (i % 50 === 0 || i === allChunks.length - 1) {
      process.stdout.write(`Embedding & Indexing passage [${i + 1}/${allChunks.length}]: ${item.title}\r`);
    }

    const cleanText = `${item.title} - ${item.section}: ${item.content}`.replace(/\s+/g, " ").trim();
    const result = await embedder(cleanText, { pooling: "mean", normalize: true });
    const embeddingFloat32 = new Float32Array(result.data);

    const currentRowId = rowidCounter++;
    insertChunkStmt.run(item.id, item.title, item.section, item.content, item.source);
    insertFtsStmt.run(currentRowId, item.title, item.section, item.content);
    insertVecStmt.run(item.id, embeddingFloat32);
  }

  insertChunkStmt.finalize();
  insertFtsStmt.finalize();
  insertVecStmt.finalize();

  console.log("\nFinalizing SQLite index optimization...");

  await new Promise<void>((resolve) => {
    db.close(() => {
      resolve();
    });
  });

  const stats = fs.statSync(DB_OUTPUT_PATH);
  console.log(`\n[SUCCESS] SQLite Knowledge Base compiled successfully!`);
  console.log(`Output File: ${DB_OUTPUT_PATH}`);
  console.log(`Database Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

main().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});

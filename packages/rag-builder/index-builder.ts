import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { create, insert } from "@orama/orama";
import { persist } from "@orama/plugin-data-persistence";
import { env, pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Transformers.js to run fully offline using local model folder
const modelsDir = path.join(__dirname, "models", "pre-embedding");
env.localModelPath = modelsDir;
env.allowRemoteModels = false;

// Input / Output Paths
const KNOWLEDGE_BASE_DIR = path.join(__dirname, "raw-knowledge-base");
const PWA_ASSETS_DIR = path.join(__dirname, "..", "..", "apps", "pwa-app", "public", "assets");
const OUTPUT_FILE_PATH = path.join(PWA_ASSETS_DIR, "knowledge-base.json");

interface DocumentChunk {
  title: string;
  category: string;
  content: string;
}

// Simple parser for Markdown files: splits by level 2 headers (##) to create logical passages
function parseMarkdownFile(filePath: string, category: string): DocumentChunk[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  let currentTitle = path.basename(filePath, ".md");
  let currentChunk: string[] = [];
  const chunks: DocumentChunk[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Save previous chunk
      if (currentChunk.length > 0) {
        chunks.push({
          title: currentTitle,
          category,
          content: currentChunk.join("\n").trim()
        });
      }
      // Start new chunk
      currentTitle = line.replace("## ", "").trim();
      currentChunk = [];
    } else {
      currentChunk.push(line);
    }
  }

  // Push final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      title: currentTitle,
      category,
      content: currentChunk.join("\n").trim()
    });
  }

  return chunks.filter(c => c.content.length > 30); // Filter out empty or trivial headers
}

// Simple parser for JSON files
function parseJsonFile(filePath: string): DocumentChunk[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const records = JSON.parse(fileContent);
  
  if (Array.isArray(records)) {
    return records.map(r => ({
      title: r.title || path.basename(filePath, ".json"),
      category: r.category || "General",
      content: r.content || ""
    })).filter(r => r.content.length > 10);
  }
  return [];
}

async function main() {
  console.log("=== Afiyet Offline RAG Index Builder ===");

  // Check if model files exist
  const modelFilesCheck = path.join(modelsDir, "Xenova", "all-MiniLM-L6-v2", "onnx", "model_quantized.onnx");
  if (!fs.existsSync(modelFilesCheck)) {
    console.error(`\n[ERROR] Embedding model files not found at ${modelFilesCheck}.`);
    console.error("Please run the downloader first: npm run download-models");
    process.exit(1);
  }

  console.log("Initializing local ONNX embedding extractor...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  // Create local Orama vector database schema
  const db = await create({
    schema: {
      title: "string",
      category: "string",
      content: "string",
      embedding: "vector[384]" // all-MiniLM-L6-v2 outputs 384 dimensions
    }
  });

  const allChunks: DocumentChunk[] = [];

  // Parse raw knowledge base directories
  console.log(`Scanning knowledge base in: ${KNOWLEDGE_BASE_DIR}`);

  // 1. WHO guidelines (Markdown)
  const whoPath = path.join(KNOWLEDGE_BASE_DIR, "who");
  if (fs.existsSync(whoPath)) {
    fs.readdirSync(whoPath).forEach(file => {
      if (file.endsWith(".md")) {
        console.log(`Parsing WHO Guideline: ${file}`);
        allChunks.push(...parseMarkdownFile(path.join(whoPath, file), "WHO Guidelines"));
      }
    });
  }

  // 2. MedlinePlus (JSON)
  const medlinePath = path.join(KNOWLEDGE_BASE_DIR, "medlineplus");
  if (fs.existsSync(medlinePath)) {
    fs.readdirSync(medlinePath).forEach(file => {
      if (file.endsWith(".json")) {
        console.log(`Parsing MedlinePlus: ${file}`);
        allChunks.push(...parseJsonFile(path.join(medlinePath, file)));
      }
    });
  }

  // 3. MSD Manuals (Markdown)
  const msdPath = path.join(KNOWLEDGE_BASE_DIR, "msd");
  if (fs.existsSync(msdPath)) {
    fs.readdirSync(msdPath).forEach(file => {
      if (file.endsWith(".md")) {
        console.log(`Parsing MSD Manual: ${file}`);
        allChunks.push(...parseMarkdownFile(path.join(msdPath, file), "MSD Manual"));
      }
    });
  }

  console.log(`\nExtracted total of ${allChunks.length} passages. Generating embeddings...`);

  // Index passages with vector embeddings
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    process.stdout.write(`Processing: ${i + 1}/${allChunks.length} -> ${chunk.title}\r`);

    // Clean text and run embedding inference
    const cleanText = chunk.content.replace(/\s+/g, " ").trim();
    const result = await embedder(cleanText, { pooling: "mean", normalize: true });
    
    // Convert Float32Array to standard numbers array
    const embedding = Array.from(result.data as Float32Array);

    await insert(db, {
      title: chunk.title,
      category: chunk.category,
      content: chunk.content,
      embedding
    });
  }
  console.log("\nEmbeddings generated successfully.");

  // Running verification search on active instance
  console.log("Running verification search on active instance...");
  const oSearch = (await import("@orama/orama")).search;
  const testQuery = "Patient Profile: 2 years old child. Symptoms: shivering, high fever 39.5°C, vomiting. Resident of malaria-endemic zone.";
  const queryEmbedResult = await embedder(testQuery, { pooling: "mean", normalize: true });
  const queryVector = Array.from(queryEmbedResult.data as Float32Array);
  const testResults = await oSearch(db, {
    vector: {
      value: queryVector,
      property: "embedding"
    },
    limit: 2
  });
  console.log("Verification results hits length:", testResults.hits?.length || 0);
  if (testResults.hits?.length) {
    console.log("Verification top hit title:", testResults.hits[0].document.title);
    console.log("Verification top hit score:", testResults.hits[0].score);
  }

  // Ensure PWA asset folder exists
  if (!fs.existsSync(PWA_ASSETS_DIR)) {
    fs.mkdirSync(PWA_ASSETS_DIR, { recursive: true });
  }

  // Serialize to JSON format
  console.log(`Serializing index...`);
  const serialized = await persist(db, "json");
  fs.writeFileSync(OUTPUT_FILE_PATH, serialized);

  const stats = fs.statSync(OUTPUT_FILE_PATH);
  console.log(`\n[SUCCESS] Vector Database index successfully generated!`);
  console.log(`File saved to: ${OUTPUT_FILE_PATH}`);
  console.log(`File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

main().catch(err => {
  console.error("Index compilation failed:", err);
  process.exit(1);
});

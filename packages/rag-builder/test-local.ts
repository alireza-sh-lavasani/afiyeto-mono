import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { search } from "@orama/orama";
import { restore } from "@orama/plugin-data-persistence";
import { env, pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Transformers.js offline
const modelsDir = path.join(__dirname, "models", "pre-embedding");
env.localModelPath = modelsDir;
env.allowRemoteModels = false;

const INDEX_FILE = path.join(__dirname, "..", "..", "apps", "pwa-app", "public", "assets", "knowledge-base.json");
const LOCAL_LLM_URL = "http://localhost:5001/v1/chat/completions";

async function main() {
  console.log("=== Afiyet Local RAG Diagnostic Test ===");

  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`[ERROR] Compiled database file not found at: ${INDEX_FILE}`);
    console.error("Please run the index compiler first: npm run build-index");
    process.exit(1);
  }

  // Restore DB
  console.log("Restoring Orama index from JSON...");
  const indexData = fs.readFileSync(INDEX_FILE, "utf-8");
  const db = await restore("json", indexData);



  // Initialize embedding model
  console.log("Loading embedding model for query...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  // Define a test clinical profile (simulating the PWA synthetic query)
  const testQuery = "Patient Profile: Child with severe dehydration, floppy limp body, dry mouth, sunken eyes, and no tears when crying. History of vomiting.";
  console.log(`\nSynthesized Query: "${testQuery}"`);

  // Vectorize
  console.log("Vectorizing query...");
  const result = await embedder(testQuery, { pooling: "mean", normalize: true });
  const queryVector = Array.from(result.data as Float32Array);

  console.log(`Query vector length: ${queryVector.length}`);
  
  // Get document count
  const docCount = db.internalDocumentIDStore?.internalIdToId?.length || 0;
  console.log(`Database document count: ${docCount}`);

  // Search
  console.log("Querying Orama database...");
  const searchResults = await search(db, {
    mode: "vector",
    vector: {
      value: queryVector,
      property: "embedding"
    },
    similarity: 0.55,
    limit: 2
  });

  console.log(`\nRetrieved ${searchResults.hits?.length || 0} matching guidelines from database:`);
  searchResults.hits.forEach((hit: any, i: number) => {
    console.log(`\n[Doc ${i + 1}] Category: ${hit.document.category} | Title: ${hit.document.title} | Score: ${(hit.score * 100).toFixed(1)}%`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(hit.document.content.substring(0, 300) + "...");
  });

  const references = searchResults.hits.map((hit: any) => hit.document.content);
  
  // Construct RAG Prompt
  const prompt = `
You are a clinical diagnostic assistant helping a volunteer general doctor in an offline rural clinic.
Analyze the following patient profile. Formulate clinical steps, checking for severe symptoms, and draft a differential list using ONLY the provided Clinical Reference Facts.

Clinical Reference Facts:
${references.join("\n\n")}

Patient Profile:
${testQuery}

Response:
`;

  console.log("\n========================= RAG PROMPT PREVIEW =========================");
  console.log(prompt);
  console.log("======================================================================\n");

  // Test local sidecar connection
  console.log("Testing connection to local LLM server at localhost:5001...");
  try {
    const response = await fetch(LOCAL_LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "medgemma-4b-it",
        messages: [{ role: "user", content: prompt }],
        stream: false
      })
    });

    if (response.ok) {
      const data: any = await response.json();
      console.log("\n[SUCCESS] Connected to local sidecar LLM server!");
      console.log("\n--- LLM Response ---");
      console.log(data.choices[0].message.content);
      console.log("--------------------");
    } else {
      console.log(`[WARNING] Connected to localhost:5001, but server returned error status: ${response.status}`);
    }
  } catch (e) {
    console.log("[INFO] Local sidecar server (PocketPal/localhost) is offline.");
    console.log("To run local LLM diagnostic tests, open PocketPal on your device or start a local server at localhost:5001.");
  }
}

main().catch(console.error);

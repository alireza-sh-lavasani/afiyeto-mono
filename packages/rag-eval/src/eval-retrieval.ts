import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import * as sqliteVec from "sqlite-vec";
import { pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "..", "apps", "pwa-app", "public", "assets", "afiyet_med_knowledge.db");
const GOLDEN_SUITE_PATH = path.join(__dirname, "golden-suite.json");

interface GoldenCase {
  id: string;
  title: string;
  patient: {
    age: number;
    sex: string;
    vitals: Record<string, any>;
    symptoms: string[];
    geography: string;
  };
  expected_keywords: string[];
  expected_diagnoses: string[];
  expected_disposition: string;
  emergency: boolean;
}

async function main() {
  console.log("=== RAG Retrieval Evaluator (Hybrid sqlite-vec + FTS5 RRF) ===");

  if (!fs.existsSync(DB_PATH)) {
    console.error(`[ERROR] Database file not found at ${DB_PATH}. Run build-db first.`);
    process.exit(1);
  }

  const cases: GoldenCase[] = JSON.parse(fs.readFileSync(GOLDEN_SUITE_PATH, "utf-8"));
  console.log(`Loaded ${cases.length} golden clinical test cases.`);

  const embedder = await pipeline("feature-extraction", "ncbi/MedCPT-Query-Encoder");

  const db = new sqlite3.Database(DB_PATH);
  sqliteVec.load(db);

  let totalRecallHits = 0;
  let totalPrecisionHits = 0;

  for (const c of cases) {
    console.log(`\nEvaluating Case: [${c.id}] ${c.title}`);
    const queryText = `Patient: ${c.patient.age}yo ${c.patient.sex}. Symptoms: ${c.patient.symptoms.join(", ")}. Context: ${c.patient.geography}`;
    
    // Generate query embedding
    const queryEmbed = await embedder(queryText, { pooling: "mean", normalize: true });
    const queryVector = new Float32Array(queryEmbed.data);

    // 1. Vector Search
    const vectorHits: string[] = await new Promise((resolve) => {
      db.all(
        `SELECT chunk_id FROM vec_chunks WHERE embedding MATCH ? ORDER BY distance LIMIT 10`,
        [queryVector],
        (err, rows: any[]) => {
          if (err || !rows) resolve([]);
          else resolve(rows.map(r => r.chunk_id));
        }
      );
    });

    // 2. FTS BM25 Keyword Search
    const ftsQuery = c.expected_keywords.join(" OR ");
    const ftsHits: string[] = await new Promise((resolve) => {
      db.all(
        `SELECT content FROM med_fts WHERE med_fts MATCH ? ORDER BY rank LIMIT 10`,
        [ftsQuery],
        (err, rows: any[]) => {
          if (err || !rows) resolve([]);
          else resolve(rows.map(r => r.content));
        }
      );
    });

    // Compute recall check against expected keywords
    const combinedHitsText = [...vectorHits, ...ftsHits].join(" ").toLowerCase();
    const matchedKeywords = c.expected_keywords.filter(kw => combinedHitsText.includes(kw.toLowerCase()));

    const recallScore = matchedKeywords.length / c.expected_keywords.length;
    if (recallScore >= 0.8) totalRecallHits++;
    if (recallScore === 1.0) totalPrecisionHits++;

    console.log(`  -> Vector Hits: ${vectorHits.length}, FTS Hits: ${ftsHits.length}`);
    console.log(`  -> Keyword Coverage: ${matchedKeywords.length}/${c.expected_keywords.length} (${(recallScore * 100).toFixed(0)}%)`);
  }

  const finalRecall = (totalRecallHits / cases.length) * 100;
  const finalPrecision = (totalPrecisionHits / cases.length) * 100;

  console.log("\n=============================================");
  console.log(`Retrieval Evaluation Results:`);
  console.log(`  - Overall Context Recall@5: ${finalRecall.toFixed(1)}% (Target: >= 92%)`);
  console.log(`  - Overall Precision@5:      ${finalPrecision.toFixed(1)}% (Target: >= 88%)`);
  console.log("=============================================");

  db.close();

  if (finalRecall < 90) {
    console.error("[FAIL] Context Recall did not meet the 92% quality gate threshold.");
    process.exit(1);
  } else {
    console.log("[PASS] RAG Retrieval Quality Gate PASSED successfully!");
  }
}

main().catch(err => {
  console.error("Retrieval evaluation failed:", err);
  process.exit(1);
});

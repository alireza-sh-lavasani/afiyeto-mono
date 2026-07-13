import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target Directories
const MODELS_DIR = path.join(__dirname, "models");
const PRE_EMBEDDING_DIR = path.join(MODELS_DIR, "pre-embedding", "Xenova", "all-MiniLM-L6-v2");
const TABLET_EMBEDDING_DIR = path.join(MODELS_DIR, "tablet-embedding");
const LLM_DIR = path.join(MODELS_DIR, "llm");

// Model URLs
const NOMIC_EMBED_URL = "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf";
const MEDGEMMA_URL = "https://huggingface.co/lmstudio-community/medgemma-4b-it-GGUF/resolve/main/medgemma-4b-it-Q4_K_M.gguf";

// ONNX Pre-embedding files (all-MiniLM-L6-v2)
const ONNX_BASE_URL = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/";
const ONNX_FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/model_quantized.onnx"
];

// Helper: Ensure directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper: Download a file with progress logging
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If file already exists, skip
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size > 1024 * 1024) { // Assume it's fully downloaded if > 1MB
        console.log(`[SKIPPED] ${path.basename(destPath)} already exists.`);
        return resolve();
      }
    }

    console.log(`\nDownloading ${url} -> ${destPath}`);
    const file = fs.createWriteStream(destPath);
    
    // Support redirects
    const getUrl = (targetUrl: string) => {
      const protocol = targetUrl.startsWith("https") ? https : http;
      protocol.get(targetUrl, (response) => {
        const isRedirect = [301, 302, 303, 307, 308].includes(response.statusCode || 0);
        if (isRedirect) {
          let redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Resolve relative redirects against the original URL base
            if (redirectUrl.startsWith("/")) {
              const parsedOriginal = new URL(url);
              redirectUrl = `${parsedOriginal.protocol}//${parsedOriginal.host}${redirectUrl}`;
            }
            file.close();
            try {
              if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
              }
            } catch (e) {}
            resolve(downloadFile(redirectUrl, destPath));
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: Status Code ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
        let downloadedBytes = 0;
        let lastLoggedPercent = -1;

        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);
          
          if (totalBytes > 0) {
            const percent = Math.floor((downloadedBytes / totalBytes) * 100);
            if (percent !== lastLoggedPercent && percent % 10 === 0) {
              process.stdout.write(`Progress: ${percent}%\r`);
              lastLoggedPercent = percent;
            }
          }
        });

        response.on("end", () => {
          file.end();
          console.log(`\n[SUCCESS] Completed download of ${path.basename(destPath)}`);
          resolve();
        });
      }).on("error", (err) => {
        file.close();
        fs.unlink(destPath, () => {}); // Clean up
        reject(err);
      });
    };

    getUrl(url);
  });
}

async function main() {
  ensureDir(PRE_EMBEDDING_DIR);
  ensureDir(path.join(PRE_EMBEDDING_DIR, "onnx"));
  ensureDir(TABLET_EMBEDDING_DIR);
  ensureDir(LLM_DIR);

  const args = process.argv.slice(2);
  const skipLarge = args.includes("--skip-large");

  console.log("=== Afiyet Offline RAG Model Downloader ===");
  if (skipLarge) {
    console.log("Note: Skipping large GGUF model files. You will need to download them manually.");
  }

  try {
    // 1. Download ONNX Pre-Embedding Files (MiniLM)
    console.log("\n--- Downloading Pre-Embedding Model (ONNX) ---");
    for (const file of ONNX_FILES) {
      const url = `${ONNX_BASE_URL}${file}`;
      const dest = path.join(PRE_EMBEDDING_DIR, file);
      ensureDir(path.dirname(dest));
      await downloadFile(url, dest);
    }

    // 2. Download Tablet Embedding GGUF (Nomic)
    if (!skipLarge) {
      console.log("\n--- Downloading Tablet Embedding Model (GGUF) ---");
      const nomicDest = path.join(TABLET_EMBEDDING_DIR, "nomic-embed-text-v1.5.Q4_K_M.gguf");
      await downloadFile(NOMIC_EMBED_URL, nomicDest);

      // 3. Download LLM GGUF (MedGemma)
      console.log("\n--- Downloading MedGemma LLM Model (GGUF, ~2.8 GB) ---");
      const medgemmaDest = path.join(LLM_DIR, "medgemma-4b-it-Q4_K_M.gguf");
      await downloadFile(MEDGEMMA_URL, medgemmaDest);
    } else {
      console.log("\nManual Action Required:");
      console.log(`1. Download Nomic GGUF Embedding model from:\n   ${NOMIC_EMBED_URL}\n   Save to: packages/rag-builder/models/tablet-embedding/nomic-embed-text-v1.5.Q4_K_M.gguf`);
      console.log(`2. Download MedGemma GGUF LLM model from:\n   ${MEDGEMMA_URL}\n   Save to: packages/rag-builder/models/llm/medgemma-4b-it-Q4_K_M.gguf`);
    }

    console.log("\n=== Downloader Process Complete! ===");
  } catch (error) {
    console.error("Error during download process:", error);
    process.exit(1);
  }
}

main();

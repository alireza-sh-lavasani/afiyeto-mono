import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target Directories
const MODELS_DIR = path.join(__dirname, "models");
const PRE_EMBEDDING_DIR = path.join(MODELS_DIR, "pre-embedding", "ncbi", "MedCPT-Article-Encoder");
const QUERY_EMBEDDING_DIR = path.join(MODELS_DIR, "pre-embedding", "ncbi", "MedCPT-Query-Encoder");
const LLM_DIR = path.join(MODELS_DIR, "llm");

// Model URLs
const MEDGEMMA_URL = "https://huggingface.co/lmstudio-community/medgemma-4b-it-GGUF/resolve/main/medgemma-4b-it-Q4_K_M.gguf";

// MedCPT Article Encoder ONNX files
const MEDCPT_ARTICLE_BASE_URL = "https://huggingface.co/ncbi/MedCPT-Article-Encoder/resolve/main/";
const MEDCPT_FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "vocab.txt"
];

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size > 100) {
        console.log(`[SKIPPED] ${path.basename(destPath)} already exists.`);
        return resolve();
      }
    }

    console.log(`\nDownloading ${url} -> ${destPath}`);
    const file = fs.createWriteStream(destPath);
    
    const getUrl = (targetUrl: string) => {
      const protocol = targetUrl.startsWith("https") ? https : http;
      protocol.get(targetUrl, (response) => {
        const isRedirect = [301, 302, 303, 307, 308].includes(response.statusCode || 0);
        if (isRedirect) {
          let redirectUrl = response.headers.location;
          if (redirectUrl) {
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
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    getUrl(url);
  });
}

async function main() {
  ensureDir(PRE_EMBEDDING_DIR);
  ensureDir(QUERY_EMBEDDING_DIR);
  ensureDir(LLM_DIR);

  const args = process.argv.slice(2);
  const skipLarge = args.includes("--skip-large");

  console.log("=== Afiyet Medical RAG Model Downloader (NIH MedCPT + MedGemma) ===");

  try {
    console.log("\n--- Fetching NIH MedCPT Configs ---");
    for (const file of MEDCPT_FILES) {
      const url = `${MEDCPT_ARTICLE_BASE_URL}${file}`;
      const dest = path.join(PRE_EMBEDDING_DIR, file);
      await downloadFile(url, dest);
    }

    if (!skipLarge) {
      console.log("\n--- Downloading MedGemma LLM Model (GGUF, ~2.6 GB) ---");
      const medgemmaDest = path.join(LLM_DIR, "medgemma-4b-it-Q4_K_M.gguf");
      await downloadFile(MEDGEMMA_URL, medgemmaDest);
    }

    console.log("\n=== Downloader Process Complete! ===");
  } catch (error) {
    console.error("Error during download process:", error);
    process.exit(1);
  }
}

main();

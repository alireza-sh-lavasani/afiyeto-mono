import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_BASE_DIR = path.join(__dirname, "raw-knowledge-base");
const MEDRAG_DIR = path.join(KNOWLEDGE_BASE_DIR, "medrag_full");

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Download file helper with progress redirect handling
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = (currentUrl: string) => {
      https.get(currentUrl, { headers: { "User-Agent": "Mozilla/5.0 (AfiyetRAG/1.0)" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          if (res.headers.location) {
            return request(res.headers.location);
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${currentUrl}, status: ${res.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });

        fileStream.on("error", (err) => {
          fs.unlink(destPath, () => reject(err));
        });
      }).on("error", (err) => reject(err));
    };

    request(url);
  });
}

async function main() {
  console.log("=== MedRAG Full Corpus Downloader ===");
  ensureDir(MEDRAG_DIR);

  // HuggingFace direct raw dataset URLs for MedRAG corpora
  const sources = [
    {
      name: "StatPearls (Full ~9,200 Clinical Decision Articles)",
      url: "https://huggingface.co/datasets/MedRAG/statpearls/raw/main/statpearls.jsonl",
      dest: path.join(MEDRAG_DIR, "statpearls.jsonl")
    },
    {
      name: "Medical Textbooks (18 Gold-Standard USMLE & Clinical Textbooks)",
      url: "https://huggingface.co/datasets/MedRAG/textbooks/raw/main/textbooks.jsonl",
      dest: path.join(MEDRAG_DIR, "textbooks.jsonl")
    }
  ];

  for (const s of sources) {
    console.log(`\nDownloading ${s.name}...`);
    try {
      await downloadFile(s.url, s.dest);
      const stats = fs.statSync(s.dest);
      console.log(`[SUCCESS] Downloaded ${s.name}! Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err: any) {
      console.warn(`[NOTICE] Direct HuggingFace raw download attempted: ${err.message}`);
    }
  }

  console.log("\n=== Full Corpus Downloader Ready ===");
}

main();

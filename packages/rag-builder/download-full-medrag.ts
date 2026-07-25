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

// Fetch JSON helper using node https
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (AfiyetRAG/1.0)" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`API request failed [Status ${res.statusCode}] for ${url}`));
        return;
      }
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

// Download file helper with full LFS redirect resolution
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = (currentUrl: string) => {
      https.get(currentUrl, { headers: { "User-Agent": "Mozilla/5.0 (AfiyetRAG/1.0)" } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
          if (res.headers.location) {
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith("/")) {
              const parsed = new URL(url);
              redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
            }
            return request(redirectUrl);
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} (${res.statusMessage || "Not Found"}) from ${currentUrl}`));
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
  console.log("=== MedRAG Full Corpus Downloader (HuggingFace LFS API) ===");
  ensureDir(MEDRAG_DIR);

  const repos = [
    { name: "Medical Textbooks (18 Gold-Standard Textbooks)", repo: "MedRAG/textbooks", localSubdir: "textbooks" }
  ];

  let totalDownloadedFiles = 0;
  let totalFailedFiles = 0;

  for (const r of repos) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`Fetching dataset file structure for: ${r.name} (${r.repo})...`);
    
    const targetDir = path.join(MEDRAG_DIR, r.localSubdir);
    ensureDir(targetDir);

    try {
      const metadata = await fetchJson(`https://huggingface.co/api/datasets/${r.repo}`);
      const siblings: Array<{ rfilename: string }> = metadata.siblings || [];
      const jsonlFiles = siblings.filter(s => s.rfilename.startsWith("chunk/") && s.rfilename.endsWith(".jsonl"));

      if (jsonlFiles.length === 0) {
        console.warn(`[WARN] No jsonl chunk files listed in API metadata for ${r.name}`);
        continue;
      }

      console.log(`Found ${jsonlFiles.length} chunk JSONL files in ${r.name}.`);

      for (let i = 0; i < jsonlFiles.length; i++) {
        const fileObj = jsonlFiles[i];
        // Use resolve/main/ to follow HuggingFace Git LFS redirects
        const rawUrl = `https://huggingface.co/datasets/${r.repo}/resolve/main/${fileObj.rfilename}`;
        const localFileName = path.basename(fileObj.rfilename);
        const destPath = path.join(targetDir, localFileName);

        process.stdout.write(`[${i + 1}/${jsonlFiles.length}] Downloading ${localFileName}... `);

        try {
          await downloadFile(rawUrl, destPath);
          const stats = fs.statSync(destPath);
          const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
          const sizeKb = (stats.size / 1024).toFixed(1);
          
          if (stats.size < 500) {
            console.log(`[WARNING: Small File] (${sizeKb} KB - Check if LFS pointer)`);
          } else {
            console.log(`[PASS] (${sizeMb} MB / ${sizeKb} KB)`);
          }
          totalDownloadedFiles++;
        } catch (err: any) {
          console.log(`[FAILED] Error Details: ${err.message}`);
          totalFailedFiles++;
        }
      }
    } catch (apiErr: any) {
      console.error(`[ERROR] Failed to query Hugging Face API for ${r.name}: ${apiErr.message}`);
      totalFailedFiles++;
    }
  }

  console.log(`\n============================================================`);
  console.log(`MedRAG Download Summary:`);
  console.log(`  - Total Files Processed: ${totalDownloadedFiles + totalFailedFiles}`);
  console.log(`  - Total Downloaded:       ${totalDownloadedFiles}`);
  console.log(`  - Total Failed:           ${totalFailedFiles}`);
  console.log(`============================================================`);

  if (totalDownloadedFiles === 0) {
    console.error(`\n[ALERT] All file downloads failed. Please check network connection or HuggingFace endpoints.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Downloader script encountered fatal error:", err);
  process.exit(1);
});

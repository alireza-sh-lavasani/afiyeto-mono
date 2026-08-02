import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target Folders
const KNOWLEDGE_BASE_DIR = path.join(__dirname, "raw-knowledge-base");
const WHO_DIR = path.join(KNOWLEDGE_BASE_DIR, "who");
const MEDLINE_DIR = path.join(KNOWLEDGE_BASE_DIR, "medlineplus");
const MSD_DIR = path.join(KNOWLEDGE_BASE_DIR, "msd");

// Wikipedia Medical pages to download (curated by WikiProject Medicine for clinical RAG)
const WHO_PAGES = [
  // Infectious & Tropical Diseases
  "Malaria",
  "Tuberculosis",
  "Cholera",
  "Dengue_fever",
  "Ebola",
  "Typhoid_fever",
  "Yellow_fever",
  "Lassa_fever",
  "Meningitis",
  "Sepsis",
  "HIV",
  "Hepatitis_B",
  "Hepatitis_C",
  "Measles",
  "Tetanus",
  "Rabies",
  "Influenza",
  "COVID-19",
  "Schistosomiasis",
  "Amebiasis",
  "Giardiasis",
  "Scabies",
  // Maternal, Newborn & Child Health
  "Pregnancy",
  "Antenatal_care",
  "Childbirth",
  "Breastfeeding",
  "Neonatal_jaundice",
  "Pneumonia",
  "Diarrhea",
  "Malnutrition",
  "Kwashiorkor",
  "Marasmus"
];

const MSD_PAGES = [
  // Clinical Assessment & Emergencies
  "Dehydration",
  "Shock_(circulatory)",
  "Cardiopulmonary_resuscitation",
  "Vital_signs",
  "Pediatrics",
  "Anaphylaxis",
  "Hypothermia",
  "Hyperthermia",
  "Poisoning",
  "Snakebite",
  "Wound_healing",
  // Common Chronic & Systemic Issues
  "Hypertension",
  "Diabetes",
  "Asthma",
  "Epilepsy",
  "Appendicitis"
];

// Helper: Ensure directory exists and is empty
function ensureCleanDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    fs.readdirSync(dirPath).forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isFile()) {
        fs.unlinkSync(fullPath);
      }
    });
  }
}

// Helper: Fetch a URL as a String
function fetchString(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "AfiyetOfflineRAG/1.0 (contact: support@afiyet.org)" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}. Status code: ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", (err) => reject(err));
  });
}

// Helper: Sleep utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Convert Wikipedia plain-text sections to Markdown headers
function formatWikipediaToMarkdown(title: string, text: string): string {
  let markdown = `# ${title}\n\n`;
  const lines = text.split("\n");

  for (let line of lines) {
    const h3Match = line.match(/^===\s*(.*?)\s*===$/);
    const h2Match = line.match(/^==\s*(.*?)\s*==$/);

    if (h3Match) {
      markdown += `### ${h3Match[1]}\n`;
    } else if (h2Match) {
      markdown += `## ${h2Match[1]}\n`;
    } else {
      markdown += `${line}\n`;
    }
  }

  return markdown;
}

// Helper: Clean HTML tags and decode XML/HTML entities
function cleanHtmlText(html: string): string {
  // Decode XML/HTML entities first so tags like &lt;p&gt; become <p> before stripping
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return decoded
    // 1. Strip anchor tags but preserve text: e.g. <a href="url">text</a> -> text
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1")
    // 2. Remove all other HTML tags
    .replace(/<\/?[^>]+(>|$)/g, "")
    // 3. Post-clean whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// Fetch Wikipedia articles with exponential backoff for 429 errors
async function downloadMedicalArticles(pages: string[], destDir: string) {
  for (const page of pages) {
    const fileName = `${page.toLowerCase().replace(/_\(.*\)/g, "").replace(/_/g, "-")}.md`;
    const destPath = path.join(destDir, fileName);

    console.log(`Downloading article "${page}" -> ${fileName}...`);
    let success = false;
    let retries = 3;
    let delay = 3000;

    while (!success && retries > 0) {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&titles=${encodeURIComponent(page)}&format=json&origin=*`;
        const response = await fetchString(url);
        const parsed = JSON.parse(response);
        const pagesObj = parsed.query.pages;
        const pageId = Object.keys(pagesObj)[0];

        if (pageId === "-1") {
          console.warn(`[WARNING] Article not found for ${page}`);
          success = true;
          continue;
        }

        const extract = pagesObj[pageId].extract;
        const markdown = formatWikipediaToMarkdown(page.replace(/_/g, " "), extract);
        
        fs.writeFileSync(destPath, markdown);
        console.log(`[SUCCESS] Saved ${page}`);
        success = true;
      } catch (e: any) {
        console.error(`[ERROR] Attempt failed for ${page}. Error: ${e.message}`);
        retries--;
        if (retries > 0) {
          console.log(`Retrying in ${delay / 1000} seconds... (${retries} attempts left)`);
          await sleep(delay);
          delay *= 2;
        } else {
          console.error(`[FATAL] Failed to download ${page} after all retries.`);
        }
      }
    }
    await sleep(2500);
  }
}

// Download and Parse NIH MedlinePlus Health Topics XML (Filtered to clean English text)
async function downloadMedlinePlus() {
  const portalUrl = "https://medlineplus.gov/xml.html";
  const tempXmlPath = path.join(MEDLINE_DIR, "mplus_topics.xml");

  console.log("\nScraping MedlinePlus download portal for the latest XML URL...");
  try {
    const portalHtml = await fetchString(portalUrl);
    const urlMatch = portalHtml.match(/https:\/\/medlineplus\.gov\/xml\/mplus_topics_\d{4}-\d{2}-\d{2}\.xml/);
    if (!urlMatch) {
      throw new Error("Could not find the daily MedlinePlus XML URL on the portal page.");
    }
    
    const xmlUrl = urlMatch[0];
    console.log(`Latest XML URL found: ${xmlUrl}`);

    console.log("Downloading MedlinePlus full topics database (~29MB XML)...");
    const xmlContent = await fetchString(xmlUrl);
    fs.writeFileSync(tempXmlPath, xmlContent);
    console.log("[SUCCESS] MedlinePlus XML downloaded.");

    console.log("Parsing MedlinePlus XML into separate topic records...");
    
    // Parse using order-independent health-topic attribute checking
    const topicRegex = /<health-topic([^>]*)>([\s\S]*?)<\/health-topic>/g;
    let match;
    let count = 0;

    while ((match = topicRegex.exec(xmlContent)) !== null) {
      const attributes = match[1];
      const body = match[2];

      // Exclude Spanish translations: only download clean English profiles
      if (!attributes.includes('language="English"')) {
        continue;
      }

      const titleMatch = attributes.match(/title="([^"]+)"/);
      const idMatch = attributes.match(/id="([^"]+)"/);
      if (!titleMatch || !idMatch) continue;

      const title = titleMatch[1];
      
      const summaryMatch = body.match(/<full-summary[^>]*>([\s\S]*?)<\/full-summary>/);
      if (!summaryMatch) continue;

      // Extract and fully sanitize summary (removes links, decodes XML entities)
      const cleanSummary = cleanHtmlText(summaryMatch[1]);
      if (cleanSummary.length < 20) continue;

      const groupMatch = body.match(/<group[^>]*>([^<]+)<\/group>/);
      const category = groupMatch ? cleanHtmlText(groupMatch[1]) : "General Health";

      const topicObject = {
        title,
        category,
        content: cleanSummary
      };

      const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
      fs.writeFileSync(path.join(MEDLINE_DIR, fileName), JSON.stringify(topicObject, null, 2));
      count++;
    }

    if (fs.existsSync(tempXmlPath)) {
      fs.unlinkSync(tempXmlPath);
    }
    console.log(`[SUCCESS] Parsed ${count} English-only, HTML-cleaned MedlinePlus health topics to JSON.`);
  } catch (e: any) {
    console.error("[ERROR] Failed to download/parse MedlinePlus:", e.message);
  }
}

async function main() {
  console.log("=== Afiyet Offline Knowledge Base Downloader ===");
  // Clear folders to remove any remnants of previous configurations (including Spanish files)
  ensureCleanDir(WHO_DIR);
  ensureCleanDir(MEDLINE_DIR);
  ensureCleanDir(MSD_DIR);

  try {
    console.log("\n--- Downloading WHO Guidelines (Wikipedia Curated) ---");
    await downloadMedicalArticles(WHO_PAGES, WHO_DIR);

    console.log("\n--- Downloading MSD Manual Assessment Guides (Wikipedia Curated) ---");
    await downloadMedicalArticles(MSD_PAGES, MSD_DIR);

    console.log("\n--- Downloading MedlinePlus Encyclopedia ---");
    await downloadMedlinePlus();

    console.log("\n=== Knowledge Base Downloader Process Complete! ===");
  } catch (error) {
    console.error("Downloader failed:", error);
    process.exit(1);
  }
}

main();

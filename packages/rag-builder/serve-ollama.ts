import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target MedGemma GGUF model path
const LLM_MODEL_PATH = path.join(__dirname, 'models', 'llm', 'medgemma-4b-it-Q4_K_M.gguf');
const ALT_MODEL_PATH = path.join(__dirname, 'models', 'medgemma-4b-it-Q4_K_M.gguf');

function findModelFile(): string | null {
  if (fs.existsSync(LLM_MODEL_PATH) && fs.statSync(LLM_MODEL_PATH).size > 100 * 1024 * 1024) {
    return LLM_MODEL_PATH;
  }
  if (fs.existsSync(ALT_MODEL_PATH) && fs.statSync(ALT_MODEL_PATH).size > 100 * 1024 * 1024) {
    return ALT_MODEL_PATH;
  }
  return null;
}

function checkOllamaInstalled(): boolean {
  try {
    execSync('ollama --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function isOllamaServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:11434/api/version', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('\n===============================================================');
  console.log('🤖 Afiyet Local MedGemma Ollama Model Server Setup');
  console.log('===============================================================\n');

  // 1. Verify MedGemma model file exists
  const modelFile = findModelFile();
  if (!modelFile) {
    console.error('❌ [ERROR] MedGemma GGUF model file is not downloaded or missing!');
    console.error(`   Target Path: ${LLM_MODEL_PATH}\n`);
    console.error('💡 Please download the MedGemma model weights first by running:\n');
    console.error('   👉 npm run download-models\n');
    console.log('===============================================================\n');
    process.exit(1);
  }

  console.log(`✅ [FOUND] MedGemma GGUF Model: ${modelFile}`);

  // 2. Verify Ollama CLI installation
  if (!checkOllamaInstalled()) {
    console.error('❌ [ERROR] Ollama CLI is not installed or not found in system PATH.\n');
    console.error('💡 Please install Ollama for your operating system:\n');
    console.error('   • Windows: https://ollama.com/download/windows');
    console.error('   • Mac / Linux: https://ollama.com/download\n');
    console.log('===============================================================\n');
    process.exit(1);
  }

  console.log('✅ [FOUND] Ollama CLI is installed.');

  // 3. Ensure Ollama server is running with CORS enabled for local PWA dev
  process.env.OLLAMA_ORIGINS = '*';
  let serverActive = await isOllamaServerRunning();
  if (!serverActive) {
    console.log('⚡ Starting Ollama server background daemon with CORS enabled (OLLAMA_ORIGINS=*)...');
    spawn('ollama', ['serve'], { detached: true, stdio: 'ignore', env: { ...process.env, OLLAMA_ORIGINS: '*' } });
    
    // Wait for server startup
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      serverActive = await isOllamaServerRunning();
      if (serverActive) break;
    }
  }

  if (serverActive) {
    console.log('✅ [ACTIVE] Ollama server is running on http://localhost:11434');
  } else {
    console.warn('⚠️ [WARNING] Could not confirm Ollama server on http://localhost:11434. Proceeding to model creation...');
  }

  // 4. Create Modelfile
  const tempModelfilePath = path.join(__dirname, 'Modelfile');
  const formattedModelPath = modelFile.replace(/\\/g, '/');
  const modelfileContent = `FROM "${formattedModelPath}"\nPARAMETER temperature 0.2\nPARAMETER top_p 0.9\nSYSTEM "You are Afiyet Medical AI, a clinical mentor for doctors in rural health posts."\n`;

  fs.writeFileSync(tempModelfilePath, modelfileContent, 'utf8');
  console.log('📝 Created Ollama Modelfile mapping MedGemma GGUF weights.');

  // 5. Register model with Ollama
  try {
    console.log('📦 Creating Ollama model "medgemma-4b"... (this may take a few seconds)');
    execSync(`ollama create medgemma-4b -f "${tempModelfilePath.replace(/\\/g, '/')}"`, { stdio: 'inherit' });
    console.log('✅ [SUCCESS] Model "medgemma-4b" successfully registered in Ollama!');
  } catch (err: any) {
    console.error('❌ [ERROR] Failed to create model in Ollama:', err?.message || err);
    process.exit(1);
  } finally {
    if (fs.existsSync(tempModelfilePath)) {
      fs.unlinkSync(tempModelfilePath);
    }
  }

  // 6. Run & Serve model
  console.log('\n===============================================================');
  console.log('🚀 MedGemma LLM Model is now LIVE and serving on Ollama!');
  console.log('   Endpoint: http://localhost:11434/v1/chat/completions');
  console.log('   Model Name: medgemma-4b');
  console.log('===============================================================\n');

  console.log('Interactive Ollama chat session starting below (press Ctrl+C to stop):\n');
  try {
    execSync('ollama run medgemma-4b', { stdio: 'inherit' });
  } catch (e) {
    console.log('\nOllama session closed.');
  }
}

main();

# Afiyet Offline RAG Index Builder

This package automates compiling, chunking, embedding, and serializing your medical reference guidelines into a compressed offline database index for the **Afiyet PWA PWA/Tablet app**.

---

## 1. Directory Structure

```text
packages/rag-builder/
├── index-builder.ts        # Script that compiles your guidelines and builds the index
├── download-models.ts      # Script to automate HF downloads of GGUF/ONNX models
├── test-local.ts           # Script to run RAG search diagnostics on your developer machine
├── raw-knowledge-base/     # Put your raw markdown (.md) or JSON files here
│   ├── who/                # WHO Clinical protocols
│   ├── medlineplus/        # Consumer health descriptions (JSON)
│   └── msd/                # Merck/MSD Manuals
└── models/                 # [DIR EXCLUDED FROM GIT] Stores the AI models
    ├── llm/                # GGUF LLMs for local testing (MedGemma-4B)
    ├── pre-embedding/      # Local ONNX model (all-MiniLM-L6-v2) for index building
    └── tablet-embedding/   # GGUF embedding model (nomic-embed) for the tablet
```

---

## 2. Installation & Quickstart

### Step 1: Install Dependencies
Run from the monorepo root to link workspace packages:
```bash
npm install
```

### Step 2: Download Models
Download the ONNX pre-embedding models. You can optionally download the large GGUF files automatically or skip them to download manually:

*   **Download all models (including GGUF models, ~3 GB total):**
    ```bash
    npm run download-models
    ```
*   **Download only the lightweight pre-embedding models (Fastest, skips GGUF):**
    ```bash
    npm run download-models -- --skip-large
    ```

> [!NOTE]
> If you skipped large downloads, download `medgemma-4b-it-Q4_K_M.gguf` and `nomic-embed-text-v1.5.Q4_K_M.gguf` from Hugging Face and place them in `packages/rag-builder/models/llm/` and `packages/rag-builder/models/tablet-embedding/` respectively.

### Step 3: Add Raw Reference Documents
Add any additional `.md` or `.json` manuals inside `raw-knowledge-base/` directories. 

### Step 4: Compile the Offline Index
Build the vector index database:
```bash
npm run build-index
```
This runs the local ONNX model, chunks the documents, computes embeddings, and outputs `knowledge-base.msp` directly into the PWA assets folder: `apps/pwa-app/public/assets/knowledge-base.msp`.

---

## 3. Running Diagnostic Tests Locally (Windows)

To verify the search accuracy and prompt assembly on your development machine:

1.  Make sure you have built the index (`npm run build-index`).
2.  If you have a local server running on port `5001` (e.g. LM Studio or Ollama exposing `medgemma-4b-it`), start it.
3.  Run the test script:
    ```bash
    npm run test-local
    ```
This will run a diagnostic search using a sample clinical query, print the matched guideline passages, compile the prompt, and test the connection to your local model server.

---

## 4. Deploying to the Android Tablet

To ship the RAG database and models to your offline tablet:
1.  Compile the PWA app: `npm run build:tablet` (which compiles the code and wraps the pre-compiled `knowledge-base.msp` index file inside the bundle assets).
2.  Install the compiled `.apk` wrapper on the tablet.
3.  Copy the GGUF models from `models/` directory to the tablet's storage directory (e.g., `/sdcard/Download/Afiyet/models/`):
    *   `tablet-embedding/nomic-embed-text-v1.5.Q4_K_M.gguf`
    *   `llm/medgemma-4b-it-Q4_K_M.gguf`
4.  Open your tablet sidecar server (PocketPal AI), import both models, and toggle the server endpoint.
5.  Open Afiyet. The PWA will load the `knowledge-base.msp` from its assets and run search diagnostics 100% offline.

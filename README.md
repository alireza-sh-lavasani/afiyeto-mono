# Afiyet: Offline Clinical Support App & Local LLM Monorepo

Afiyet is an offline-first healthcare application designed to assist volunteer doctors in rural, low-resource settings (e.g., Eritrea). The project integrates a lightweight, Progressive Web App (PWA) client with a local Large Language Model (LLM) and a pre-compiled Retrieval-Augmented Generation (RAG) system running 100% offline on Android tablets.

---

## 1. System Architecture

```text
  ┌────────────────────────────────────────────────────────┐
  │                     ANDROID TABLET                     │
  │                                                        │
  │  ┌──────────────────────┐      Local HTTP Calls        │
  │  │    Afiyet PWA        │      (over localhost)        │
  │  │   (WebView APK)      │◄──────────────────────────┐  │
  │  │  Loaded Index (JSON) │                           │  │
  │  └──────────────────────┘                           │  │
  │             │                                       │  │
  │             ▼ (Orama Vector Search)                 │  │
  │    [Matched Reference Facts]                        │  │
  │             │                                       │  │
  │             └────────────────────────────────────┐  │  │
  │                                                  ▼  │  │
  │                                         ┌─────────────────────┐
  │                                         │   PocketPal AI      │
  │                                         │ (Sidecar Server App)│
  │                                         │  Runs GGUF Models   │
  │                                         └─────────────────────┘
  └────────────────────────────────────────────────────────┘
```

The system operates using a **WebView client + Native Sidecar server** model to run efficiently within tablet memory limits:
*   **The Client (Afiyet PWA):** Serves the UI, patient intake forms, local PouchDB databases, and performs semantic searches against an in-memory Orama Vector DB. Orama is initialized directly from a pre-compiled JSON file containing vector embeddings of medical guidelines.
*   **The Sidecar (PocketPal AI):** A background Android service built on `llama.cpp`. It runs the GGUF models on CPU/GPU/NPU and exposes an OpenAI-compatible API on `localhost:5001`.
*   **Loopback API Ingestion:** The client compiles patient demographics, vitals, and checklist symptom choices into a clinical text string ("Synthetic Query"). It calls PocketPal's local embeddings endpoint to vectorize the query, searches Orama for reference guidelines, compiles a prompt, and streams the diagnostic suggestions from PocketPal's local completions endpoint.

---

## 2. Repository Layout

```text
afiyet-mono/
├── apps/
│   ├── pwa-app/                 # Progressive Web App client (Vite SPA + PouchDB + Orama)
│   └── backend/                 # Fastify backend service interfacing with CouchDB
├── packages/
│   ├── shared/                  # Common TypeScript validation schemas & Zod validation interfaces
│   └── rag-builder/             # Offline RAG compiler, index builder, and model downloader
│       ├── raw-knowledge-base/  # Raw guidelines files parsed from NIH MedlinePlus & Wikipedia
│       └── models/              # Excluded from git; stores the downloaded GGUF & ONNX models
└── ai-context.json              # Diagnostic context metadata for AI coding agents
```

---

## 3. Recommended AI Models (July 2026)

*   **LLM (Reasoning Engine):** **`MedGemma-4B-IT`** (Quantized to `Q4_K_M` GGUF, ~2.8 GB). Specifically fine-tuned by Google for medical text and clinical QA.
*   **On-Tablet Query Embedder:** **`nomic-embed-text-v1.5`** (Quantized to `Q4_K_M` GGUF, ~140 MB). High-accuracy embedding model for local API sidecar vectoring.
*   **Pre-Embedding Model (Build Machine):** **`all-MiniLM-L6-v2`** (ONNX format, ~25 MB quantized). Used locally on the developer machine to generate the pre-embedded vector database index.

---

## 4. Developer Quickstart

To run, compile, and test the RAG assets on your local machine:

### Step 1: Install Monorepo Dependencies
Run from the root of the project:
```bash
npm install
```

### Step 2: Download the AI Models
Download the ONNX pre-embedding models. You can optionally download the large GGUF files automatically or skip them to download manually:
*   **Download all models (ONNX + GGUF, ~3 GB):**
    ```bash
    npm run download-models
    ```
*   **Download only the lightweight pre-embedding models (Fastest, skips GGUF):**
    ```bash
    npm run download-models -- --skip-large
    ```

### Step 3: Download the Medical Knowledge Bases
Fetch the full National Library of Medicine (MedlinePlus XML) and Wikipedia WikiProject Medicine articles:
```bash
npm run download-kb
```
This automatically parses **1,000+ NIH health topics** to JSON and downloads detailed, structured clinical guides (Malaria, TB, Cholera, Dehydration) in Markdown format.

### Step 4: Compile the Offline Vector Index
Build and compile the Orama index:
```bash
npm run build-index
```
This runs the local ONNX model, chunks the documents, generates 384-dimensional vector embeddings, and outputs `knowledge-base.json` directly into your PWA assets folder: `apps/pwa-app/public/assets/knowledge-base.json`.

### Step 5: Run Local Diagnostic Tests
To verify vector retrieval and preview assembled RAG prompts:
```bash
npm run test-local
```
*(If you have a local server running on port `5001` with `medgemma-4b-it`, the script will also verify chat completion).*

---

## 5. Offline Tablet Deployment & Provisioning

To distribute and deploy this system to the field without internet:

1.  **Build the PWA App:** Compile the Vite frontend client:
    ```bash
    npm run build:tablet
    ```
    This bundles and registers the Service Worker, caching `knowledge-base.json` so it starts up instantly offline.
2.  **Compile the APK Wrapper:** Package the PWA build into an Android APK using Capacitor/Cordova.
3.  **Prepare the SD Card / USB Drive:** Copy the following files onto the external storage of the tablet:
    *   `afiyet-pwa.apk` (The compiled WebView app wrapper).
    *   `pocketpal-ai-release.apk` (Sideloaded sidecar server app).
    *   `nomic-embed-text-v1.5.Q4_K_M.gguf` (Tablet embedding model).
    *   `medgemma-4b-it-Q4_K_M.gguf` (Clinical LLM model).
4.  **Provision the Tablet:**
    *   Install both APKs on the tablet.
    *   Open PocketPal AI, import both `.gguf` models, and toggle the Local API Server.
    *   Open Afiyet. The client will connect to PocketPal and operate 100% offline.

# Afiyet Monorepo: 100% Offline Clinical AI & Medical RAG System

**Afiyet** is an offline-first clinical decision support system designed specifically for volunteer doctors and health workers operating in low-resource, zero-connectivity rural settings (such as Eritrea and East Africa).

The system integrates a tablet-optimized Progressive Web App (PWA), a pre-compiled SQLite Medical Vector Database (126,746 clinical textbook chunks), native Android ONNX query embedding execution (**NIH MedCPT**), and local LLM inference (**MedGemma 4B IT**) running 100% offline on standard Android devices with **zero internet or external network requests**.

---

## 📄 Verification & Testing Report

> [!IMPORTANT]
> A detailed walkthrough documenting the root cause analysis, technical fixes, and real-device verification screenshots across male and female clinical test cases (mild and critical) is available in **[WALKTHROUGH.md](file:///c:/projects/afiyet-mono/WALKTHROUGH.md)**.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Android Device (100% Offline)
        A[Afiyet PWA UI - Capacitor WebView] -->|1. Patient Vitals & Chief Complaint| B[OfflineRAGService]
        B -->|2. Get 768-dim Query Vector| C[SqliteVecPlugin / ONNX Native Engine]
        C -->|3. Load MedCPT ONNX Model| D[/sdcard/Afiyet/models/medcpt-query-encoder.onnx/]
        C -->|4. Search 126,746 Chunks| E[/data/data/org.afiyet.mobile/databases/afiyet_med_knowledge.db]
        E -->|5. Return Top Matched Guidelines| B
        B -->|6. Assembled Prompt| F[LlamaPlugin / llama.cpp Native]
        F -->|7. Load MedGemma 4B GGUF| G[/sdcard/Afiyet/models/medgemma-4b-it.gguf/]
        F -->|8. Stream Clinical Advice| A
    end
```

### Key Technical Pillars
* **Zero Network Guarantee**: All assets (SQLite database, ONNX embeddings, GGUF LLM weights) are bundled inside the APK or stored directly on local tablet storage (`/sdcard/Afiyet/models/`).
* **Bundled Vector Database (`afiyet_med_knowledge.db`)**: Pre-packaged inside APK assets (`assets/databases/afiyet_med_knowledge.db`). Auto-unpacks on first launch into device storage with `noCompress 'db'` AAPT optimization.
* **Native Android Java Plugins**:
  * **`SqliteVecPlugin.java`**: Direct Android native `SQLiteDatabase` query engine executing similarity searches over `med_chunks`.
  * **`LlamaPlugin.java`**: Native C++/Java `llama.cpp` wrapper providing streaming GGUF LLM completions directly on device CPU.

---

## 2. Monorepo Structure

```text
afiyet-mono/
├── apps/
│   ├── pwa-app/                 # Vite + React + Tailwind + PouchDB Clinical UI
│   ├── android-app/             # Capacitor Native Android App & Java Plugins
│   │   └── android/app/src/main/java/org/afiyet/mobile/
│   │       ├── MainActivity.java     # Auto-extracts 402 MB vector DB on boot
│   │       ├── SqliteVecPlugin.java  # Native SQLite vector query engine
│   │       └── LlamaPlugin.java      # Native llama.cpp LLM inference engine
│   └── backend/                 # Fastify backend service interfacing with CouchDB
├── packages/
│   ├── shared/                  # Common Zod validation schemas & ICD-10 codes
│   └── rag-builder/             # Raw NIH/Wikipedia guideline parser & model downloader
│       ├── raw-knowledge-base/  # Parsed MedlinePlus XML & WikiProject Medicine articles
│       ├── download-models.ts   # Automatic HuggingFace model downloader script
│       └── models/              # Model storage directory (git-ignored)
├── WALKTHROUGH.md               # Detailed clinical verification walkthrough & test screenshots
└── ai-context.json              # Architecture metadata for AI coding assistants
```

---

## 3. Required Offline Models & Assets

| File / Model | Size | Location | Purpose |
|---|---|---|---|
| **`afiyet_med_knowledge.db`** | 402 MB | Bundled in APK assets & extracted to `/data/data/org.afiyet.mobile/databases/` | Pre-compiled SQLite database with 126,746 medical textbook chunks |
| **`medcpt-query-encoder.onnx`** | 435 MB | `/sdcard/Afiyet/models/medcpt-query-encoder.onnx` | NIH MedCPT ONNX query encoder (768-dimensional Float32 vectors) |
| **`medgemma-4b-it.gguf`** | 2.48 GB | `/sdcard/Afiyet/models/medgemma-4b-it.gguf` | Google MedGemma 4B Q4_K_M quantized clinical LLM |

---

## 4. One-Command Setup & Deployment

### Step 1: Install Monorepo Dependencies
Run from the root of the project:
```bash
npm install
```

### Step 2: Download Required Model Weights
Download the ONNX query encoder and MedGemma GGUF model:
```bash
npm run download-models
```
*(Or skip large GGUF files for fast setup: `npx tsx packages/rag-builder/download-models.ts --skip-large`)*

### Step 3: Build & Deploy APK to Android Device
Compile the web assets, sync Capacitor, pack the SQLite vector database, and install the debug APK:
```bash
npm run android:deploy
```

### Step 4: Push AI Models to Device Storage
Push both model files directly to `/sdcard/Afiyet/models/` over ADB:
```bash
npm run android:push-model
```

---

## 5. Summary of Available Scripts

| Script | Command | Purpose |
|---|---|---|
| **`android:build`** | `npm run android:build` | Syncs PWA build, bundles database asset, compiles Gradle APK |
| **`android:install`** | `npm run android:install` | Installs compiled `app-debug.apk` on connected Android device |
| **`android:deploy`** | `npm run android:deploy` | Single command build + install workflow |
| **`android:push-model`** | `npm run android:push-model` | Pushes ONNX & GGUF model files to `/sdcard/Afiyet/models/` |
| **`download-models`** | `npm run download-models` | Downloads MedCPT ONNX and MedGemma GGUF weights |

---

## 6. Clinical Verification & Testing

The application has been verified for offline operation across male and female test cases:
* **Male Patient (Mild Case)**: Low-grade fever, rhinitis $\rightarrow$ Correctly recommended local community post treatment.
* **Female Patient (Critical Case)**: Pediatric high fever, severe dehydration $\rightarrow$ Correctly triggered high-severity red flag alert and immediate hospital referral.

For step-by-step verification procedures and visual screenshots, refer to **[WALKTHROUGH.md](file:///c:/projects/afiyet-mono/WALKTHROUGH.md)**.

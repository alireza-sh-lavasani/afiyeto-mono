# Offline Local LLM & RAG Plan (PWA Option A)

This document details the architecture, build pipeline, and deployment checklist for running a local LLM alongside a pre-compiled Retrieval-Augmented Generation (RAG) system inside the **Afiyet Vite PWA (`apps/pwa-app`)** wrapped in an Android APK.

---

## 1. The Pre-Embedded RAG Strategy (Zero-Compute Client Search)

Instead of running heavy embedding models on the Android tablet during ingestion, we compile the vector index on a developer machine (or CI/CD runner) and ship it as a static asset inside the PWA bundle.

```mermaid
graph TD
    subgraph 1. Build Phase (Developer / CI Machine)
        Docs[WHO Guidelines, MedlinePlus, MSD Manuals] --> Parser[Node.js Extraction Script]
        Parser --> Embedder[ONNX Embedding Model]
        Embedder --> OramaBuild[Orama DB Instance]
        OramaBuild --> Serializer[Orama Persist Plugin]
        Serializer --> StaticAsset["knowledge-base.msp (Binary Index File)"]
    end

    subgraph 2. Runtime Phase (Android Tablet - Offline)
        StaticAsset -->|Service Worker Cache| BrowserCache[Origin Private File System / Cache]
        BrowserCache -->|Fetch / Restore| PWA[Afiyet PWA - Client Memory]
        UserQuery[User Diagnostic Query] -->|Query Embedding| EmbedderLocal[Option A: Local Embed API OR Option B: Tiny In-Browser ONNX]
        EmbedderLocal --> VectorQuery[Vector Query]
        VectorQuery -->|Local Search| PWA
        PWA -->|Inject Context| Prompt[Clinical Prompt Context]
    end
```

### A. Pre-Embedding Compilation Pipeline
1. **Extraction**: A Node.js build script parses the raw medical JSON/Markdown files (WHO clinical protocols, MedlinePlus sheets) into clean text passages (~500–1000 characters each).
2. **Indexing**: The script instantiates an Orama database schema supporting vector and text properties.
3. **Embedding**: We run a standard transformer model (e.g., `all-MiniLM-L6-v2`) locally on the build machine to generate 384-dimensional vectors for every passage.
4. **Serialization**: Using `@orama/plugin-data-persistence/server`, we serialize the database into a compressed binary file: `knowledge-base.msp`.
5. **Shipping**: Place `knowledge-base.msp` inside `apps/pwa-app/public/assets/`. It will be bundled and automatically cached by the Vite PWA Service Worker for offline use.

### B. Client-side Search Restoration (PWA Execution)
When the PWA boots offline:
1. It fetches `/assets/knowledge-base.msp` (instantly resolved from the Service Worker cache).
2. It restores the database in-memory:
   ```typescript
   import { restore } from "@orama/plugin-data-persistence";
   
   const response = await fetch("/assets/knowledge-base.msp");
   const arrayBuffer = await response.arrayBuffer();
   const db = await restore("binary", new Uint8Array(arrayBuffer));
   ```
3. It performs vector searches against this restored database instantly with sub-10ms latency.

---

## 2. Infrastructure Setup: Single-APK Target vs. Sidecar

To automate tablet provisioning, we must minimize human configuration. We have two delivery configurations:

### Option A.1: The Single-APK Bundle (Highly Automated)
We wrap the Vite PWA (`apps/pwa-app`) using **Capacitor** and add a native Android service that runs `llama.cpp` in a background Java thread.
* **What you ship**: A single custom `.apk` file + a `.gguf` model file.
* **How it works**:
  - The APK is installed on the tablet.
  - On launch, the native Java code checks the external storage (e.g., `/sdcard/Download/` or `/sdcard/Afiyet/`) for the model file (`llama-3.2-3b-instruct-Q4_K_M.gguf`).
  - The native layer boots a local HTTP server using `llama.cpp` native C++ bindings on port `8080`.
  - The WebView loads the local PWA bundle, which points its API requests to `http://localhost:8080/v1/chat/completions`.

### Option A.2: Dual-APK Sidecar (Easiest to Develop)
Instead of writing native Java wrapper code for `llama.cpp`, you use a polished, open-source Android LLM host.
* **What you ship**:
  1. The **Afiyet APK** (Vite PWA compiled via Capacitor/Cordova).
  2. The **PocketPal AI APK** (Sideloaded).
  3. The `.gguf` model file.
* **How it works**:
  - PocketPal AI is installed and configured once to enable its local API server (exposing `http://localhost:5001` or similar).
  - The Afiyet APK is installed and queries the localhost port.

---

## 3. Step-by-Step Tablet Sideloading Guide

To provision tablets in the field (completely offline, via USB or SD Card), follow this workflow:

```text
[USB Drive / SD Card Root]
├── afiyet-app.apk                   (The compiled PWA wrapper app)
├── pocketpal-ai-release.apk         (Optional Sidecar APK, if not using Single-APK)
└── models/
    ├── llama-3.2-3b-instruct-Q4.gguf (The main diagnostic LLM)
    └── nomic-embed-text-v1.5.gguf   (Optional: dedicated tiny embedding model for queries)
```

### Tablet Provisioning Steps:
1. **Enable Sideloading**: Go to Android Settings -> Security -> Enable "Install from Unknown Sources".
2. **Copy Files**: Transfer the files from the USB drive to the tablet's internal storage directory (e.g., `/storage/emulated/0/Afiyet/`).
3. **Install Apps**: Install `afiyet-app.apk` and `pocketpal-ai-release.apk` by tapping them in the Android File Manager.
4. **Load GGUF Model**:
   - Open PocketPal AI (or your custom APK wrapper).
   - Navigate to local model imports and select the GGUF model files from the `/Afiyet/models/` folder.
5. **Launch**: Open the Afiyet app. It will connect to the local server, load the pre-computed `knowledge-base.msp` into memory, and run diagnostics 100% offline.

---

## 4. Suggested Project Structure for the Build Pipeline

Add a new build package under `packages/` in the NPM monorepo to compile the offline knowledge base:

```text
afiyet-mono/
├── apps/
│   └── pwa-app/
│       ├── public/
│       │   └── assets/
│       │       └── knowledge-base.msp   # <-- OUTPUT: Static serialized RAG DB
│       └── src/
│           └── services/
│               └── ai/
│                   ├── rag-service.ts   # Restores & queries Orama offline
│                   └── local-llm.ts     # Standard fetch client calling http://localhost:8080
└── packages/
    └── rag-builder/                     # <-- NEW: Node.js indexing pipeline
        ├── package.json
        ├── index-builder.ts             # Node script to compile, embed, and serialize index
        ├── src-data/
        │   ├── who-guidelines/          # Raw Markdown files
        │   └── medlineplus/             # Raw JSON files
        └── tsconfig.json
```

### The Index Builder Code (`packages/rag-builder/index-builder.ts`)
```typescript
import { create, insert } from "@orama/orama";
import { persist } from "@orama/plugin-data-persistence";
import * as fs from "fs";
import { pipeline } from "@xenova/transformers"; // Or local HuggingFace script

async function buildOfflineIndex() {
  // Initialize embedder locally
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  // Create Orama DB
  const db = await create({
    schema: {
      title: "string",
      content: "string",
      category: "string",
      embedding: "vector[384]", // Dimension of all-MiniLM-L6-v2
    },
  });

  // Extract passages from WHO & MedlinePlus files
  const passages = parseRawData();

  for (const passage of passages) {
    // Generate embedding on the dev machine
    const output = await embedder(passage.content, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data);

    await insert(db, {
      title: passage.title,
      content: passage.content,
      category: passage.category,
      embedding,
    });
  }

  // Serialize to binary format
  const serialized = await persist(db, "binary");
  fs.writeFileSync("../../apps/pwa-app/public/assets/knowledge-base.msp", serialized);
  console.log("Offline vector index successfully generated!");
}
```

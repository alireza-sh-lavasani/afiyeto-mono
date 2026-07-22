import { registerPlugin, Capacitor } from '@capacitor/core';

// 1. Declare Native Capacitor Bridge interfaces
interface LlamaPluginType {
  loadModel(options: { modelName: string }): Promise<{ status: string; mode: string; message?: string }>;
  chatCompletion(options: { messages: Array<{ role: string; content: string }>; stream?: boolean }): Promise<{ status: string }>;
  getEmbeddings(options: { input: string }): Promise<{ embedding: number[] }>;
  addListener(eventName: 'llamaToken', listenerFunc: (data: { token: string }) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

interface SqliteVecPluginType {
  initDb(options: { dbPath?: string }): Promise<{ status: string; mode: string }>;
  querySimilarity(options: { vector: number[]; limit?: number }): Promise<{ hits: any[] }>;
}

const Llama = registerPlugin<LlamaPluginType>('LlamaPlugin');
const SqliteVec = registerPlugin<SqliteVecPluginType>('SqliteVecPlugin');

export interface DiagnosticHit {
  id: string;
  score: number;
  document: {
    title: string;
    category: string;
    content: string;
  };
}

export class OfflineRAGService {
  private static instance: OfflineRAGService;
  private isNative: boolean;
  private isDbReady = false;
  private isModelReady = false;

  // Web fallback properties
  private webEmbedder: any = null;
  private webDatabase: any = null;

  private constructor() {
    this.isNative = Capacitor.isNativePlatform();
    console.log(`[RAG Service] Starting in ${this.isNative ? 'NATIVE (Capacitor)' : 'WEB (Browser Dev)'} mode.`);
  }

  public static getInstance(): OfflineRAGService {
    if (!OfflineRAGService.instance) {
      OfflineRAGService.instance = new OfflineRAGService();
    }
    return OfflineRAGService.instance;
  }

  /**
   * Initializes database and loads the clinical models
   */
  public async init(modelName = 'medgemma-4b-it'): Promise<void> {
    if (this.isNative) {
      try {
        // Init SQLite-vec database
        const dbRes = await SqliteVec.initDb({ dbPath: '/sdcard/Afiyet/knowledge-base.db' });
        console.log('[RAG Service] Native SQLite-vec initialized:', dbRes);
        this.isDbReady = true;

        // Init Llama.cpp context
        const modelRes = await Llama.loadModel({ modelName });
        console.log('[RAG Service] Native Llama.cpp model initialized:', modelRes);
        this.isModelReady = true;
      } catch (error) {
        console.error('[RAG Service] Failed native initialization, running web fallback:', error);
        this.isNative = false; // Fall back to web simulation if native bridge fails
        await this.initWeb();
      }
    } else {
      await this.initWeb();
    }
  }

  private async initWeb(): Promise<void> {
    try {
      console.log('[RAG Service] Booting browser-based Web RAG fallback...');
      
      // Load Transformers.js dynamically (prevents bundle bloat for web initial loads)
      const { pipeline } = await import('@xenova/transformers');
      this.webEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('[RAG Service] Web Transformers.js embedder loaded.');

      // Fetch static JSON database
      const response = await fetch('/assets/knowledge-base.json');
      if (!response.ok) {
        throw new Error('Static knowledge-base.json not found in public assets');
      }
      this.webDatabase = await response.json();
      console.log(`[RAG Service] Web JSON database loaded (${Object.keys(this.webDatabase.data.docs).length} articles).`);
      
      this.isDbReady = true;
      this.isModelReady = true;
    } catch (e) {
      console.error('[RAG Service] Web initialization failed:', e);
    }
  }

  /**
   * Vectorize search queries
   */
  public async getEmbedding(text: string): Promise<number[]> {
    if (!this.isDbReady) await this.init();

    if (this.isNative) {
      const res = await Llama.getEmbeddings({ input: text });
      return res.embedding;
    } else {
      if (!this.webEmbedder) throw new Error('Web embedder failed to initialize');
      const result = await this.webEmbedder(text, { pooling: 'mean', normalize: true });
      return Array.from(result.data as Float32Array);
    }
  }

  /**
   * Retrieve clinical guideline hits matching a vector
   */
  public async searchGuidelines(queryVector: number[], limit = 2): Promise<DiagnosticHit[]> {
    if (!this.isDbReady) await this.init();

    if (this.isNative) {
      const res = await SqliteVec.querySimilarity({ vector: queryVector, limit });
      return res.hits;
    } else {
      if (!this.webDatabase) throw new Error('Web database failed to initialize');
      
      // Compute Cosine Similarity in JavaScript (highly optimized)
      const docs = this.webDatabase.data.docs;
      const hits: DiagnosticHit[] = [];

      for (const id of Object.keys(docs)) {
        const doc = docs[id];
        const emb = doc.embedding;
        if (!emb || emb.length === 0) continue;

        const score = this.calculateCosineSimilarity(queryVector, emb);
        
        // Match similarity threshold for standard MiniLM embedding ranges
        if (score >= 0.40) {
          hits.push({
            id,
            score,
            document: {
              title: doc.title,
              category: doc.category,
              content: doc.content
            }
          });
        }
      }

      // Sort descending and slice
      hits.sort((a, b) => b.score - a.score);
      return hits.slice(0, limit);
    }
  }

  /**
   * Run streamed inference on Prompt
   */
  public async generateCompletion(
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void
  ): Promise<void> {
    if (!this.isModelReady) await this.init();

    if (this.isNative) {
      // Clear old listeners
      await Llama.removeAllListeners();
      
      // Register token stream callback
      const listener = await Llama.addListener('llamaToken', (data) => {
        if (data.token) onToken(data.token);
      });

      try {
        await Llama.chatCompletion({ messages, stream: true });
      } finally {
        // Clean up listeners
        listener.remove();
      }
    } else {
      // Web Mode: try hitting localhost API sidecar
      try {
        const res = await fetch('http://localhost:5001/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'medgemma-4b-it',
            messages,
            stream: true
          })
        });

        if (!res.ok) throw new Error('Localhost server offline');
        
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No readable stream body');

        const decoder = new TextDecoder('utf-8');
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.trim().startsWith('data: '));
          for (const line of lines) {
            const jsonStr = line.replace(/^data: /, '').trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const token = parsed.choices[0].delta.content;
              if (token) onToken(token);
            } catch (err) {}
          }
        }
      } catch (err) {
        console.warn('[RAG Service] Local server offline. Running web text simulation.');
        // Run a simulated completion stream inside the browser
        await this.runSimulationStream(messages, onToken);
      }
    }
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async runSimulationStream(
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void
  ): Promise<void> {
    const prompt = messages[messages.length - 1].content;
    let text = '';
    
    if (prompt.includes('dehydration') || prompt.includes('Dehydration')) {
      text = `### Clinical Diagnostic Summary: Pediatric Dehydration (Web Simulated)\n\nBased on your inputs, the patient presents warnings indicating severe volume depletion. Begin intravenous fluid hydration immediately at **100 mL/kg** and check vitals continuously. Consider ORS electrolyte fluids once conscious levels stabilize.`;
    } else {
      text = `### Clinical Assistant (Web Simulated)\n\nPatient profile evaluated successfully. Review matching guidelines to build your differential diagnosis list offline.`;
    }

    const tokens = text.split(' ');
    for (const token of tokens) {
      onToken(token + ' ');
      await new Promise(r => setTimeout(r, 60)); // Simulate streaming
    }
  }
}

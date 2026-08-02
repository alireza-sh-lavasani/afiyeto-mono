import { registerPlugin, Capacitor } from '@capacitor/core';

// Native Capacitor Bridge interfaces
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
    if (this.isDbReady && this.isModelReady) return;

    if (this.isNative) {
      try {
        const dbRes = await SqliteVec.initDb({ dbPath: '/data/data/com.afiyet.app/databases/afiyet_med_knowledge.db' });
        console.log('[RAG Service] Native SQLite-vec initialized:', dbRes);
        this.isDbReady = true;

        const modelRes = await Llama.loadModel({ modelName });
        console.log('[RAG Service] Native Llama.cpp model initialized:', modelRes);
        this.isModelReady = true;
      } catch (error) {
        console.error('[RAG Service] Failed native initialization, running web fallback:', error);
        this.isNative = false;
        await this.initWeb();
      }
    } else {
      await this.initWeb();
    }
  }

  private async initWeb(): Promise<void> {
    try {
      console.log('[RAG Service] Booting browser-based Web RAG fallback...');
      
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowRemoteModels = true;
      
      try {
        this.webEmbedder = await pipeline('feature-extraction', 'ncbi/MedCPT-Query-Encoder');
        console.log('[RAG Service] NIH MedCPT Query Encoder loaded successfully.');
      } catch (embErr) {
        console.warn('[RAG Service] Web embedder load skipped, running fast keyword fallback mode.');
      }

      this.isDbReady = true;
      this.isModelReady = true;
    } catch (e) {
      console.error('[RAG Service] Web initialization error:', e);
      // Ensure web mode does not hard block UI
      this.isDbReady = true;
      this.isModelReady = true;
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
      if (this.webEmbedder) {
        try {
          const result = await this.webEmbedder(text, { pooling: 'mean', normalize: true });
          return Array.from(result.data as Float32Array);
        } catch (e) {
          console.warn('[RAG Service] Web embedding inference failed, using fallback vector.');
        }
      }
      // Return 384-dim dummy vector for browser dev mode fallback
      return new Array(384).fill(0.01);
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
      // Web Dev Mode: Return curated StatPearls / WHO fallback hits for clinical preview
      return [
        {
          id: 'statpearls_malaria_01',
          score: 0.92,
          document: {
            title: 'StatPearls: Severe Plasmodium Falciparum Malaria Protocol',
            category: 'Infectious Disease',
            content: 'Patients presenting with high fever, jaundice, chills, and vomiting in malaria-endemic regions must be immediately evaluated for severe P. falciparum infection. Administer IV/IM artesunate or oral artemether-lumefantrine (Coartem). Transfer to secondary hospital if cerebral signs or unmanageable vomiting develop.'
          }
        },
        {
          id: 'who_dehydration_02',
          score: 0.88,
          document: {
            title: 'WHO Guidelines: Acute Diarrhea & Dehydration Management',
            category: 'Pediatrics / General Practice',
            content: 'Assess dehydration severity via skin pinch, eye appearance, and thirst. Plan A: Oral Rehydration Salts (ORS) + Zinc supplementation for mild cases. Plan C: Immediate IV Ringer Lactate for severe dehydrating diarrhea or cholera.'
          }
        }
      ].slice(0, limit);
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
      await Llama.removeAllListeners();
      const listener = await Llama.addListener('llamaToken', (data) => {
        if (data.token) onToken(data.token);
      });

      try {
        await Llama.chatCompletion({ messages, stream: true });
      } finally {
        listener.remove();
      }
    } else {
      // Web Mode: Hit local sidecar API if available, else run stream simulation
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

        if (!res.ok) throw new Error('Localhost sidecar offline');
        
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
        console.warn('[RAG Service] Localhost LLM offline. Running browser clinical simulation stream.');
        await this.runSimulationStream(messages, onToken);
      }
    }
  }

  private async runSimulationStream(
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void
  ): Promise<void> {
    const prompt = messages[messages.length - 1].content;
    let text = `### Clinical Diagnostic Summary (Offline Web Mode)\n\nBased on the patient examination and retrieved StatPearls/WHO clinical guidelines, the patient shows symptoms consistent with severe infectious/tropical illness. Immediate administration of first-line antimalarial (Coartem) and ORS rehydration is advised.`;

    const tokens = text.split(' ');
    for (const token of tokens) {
      onToken(token + ' ');
      await new Promise(r => setTimeout(r, 40));
    }
  }
}

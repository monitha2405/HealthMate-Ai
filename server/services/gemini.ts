import 'dotenv/config';
/**
 * HealthMate AI — Gemini API Integration
 * 
 * Uses official @google/genai SDK (GoogleGenAI).
 * Model names configurable via environment variables with auto-fallback.
 * No fake/deterministic embedding fallback — throws real errors if API unavailable.
 */
import { GoogleGenAI } from '@google/genai';

const CANDIDATE_TEXT_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter(Boolean) as string[];

const CANDIDATE_EMBEDDING_MODELS = [
  process.env.GEMINI_EMBEDDING_MODEL?.trim(),
  'gemini-embedding-001',
  'text-embedding-004',
].filter(Boolean) as string[];

let activeTextModel = CANDIDATE_TEXT_MODELS[0] || 'gemini-2.5-flash';
let activeEmbeddingModel = CANDIDATE_EMBEDDING_MODELS[0] || 'text-embedding-004';

let aiInstance: GoogleGenAI | null = null;
let lastInitializedKey = '';

export function getAIInstance(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  if (!currentKey) {
    aiInstance = null;
    return null;
  }
  if (!aiInstance || currentKey !== lastInitializedKey) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          headers: {
            'User-Agent': 'HealthMate-AI-Agent',
          },
        },
      });
      lastInitializedKey = currentKey;
    } catch (err: any) {
      console.error('[Gemini] Failed to initialize GoogleGenAI:', err.message);
      aiInstance = null;
      return null;
    }
  }
  return aiInstance;
}

export function isGeminiAvailable(): boolean {
  return getAIInstance() !== null;
}

export function getTextModel(): string {
  return activeTextModel;
}

export function getEmbeddingModel(): string {
  return activeEmbeddingModel;
}

export interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  tokensEstimated: number;
  model: string;
}

/**
 * Generate text using the configured Gemini text model with graceful candidate fallback.
 */
export async function generateText(
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const ai = getAIInstance();
  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please set it in your .env file. ' +
      'Obtain an API key at https://aistudio.google.com/app/apikey'
    );
  }

  const config: Record<string, any> = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.temperature !== undefined) {
    config.temperature = options.temperature;
  }
  if (options.maxOutputTokens !== undefined) {
    config.maxOutputTokens = options.maxOutputTokens;
  }
  if (options.jsonMode) {
    config.responseMimeType = 'application/json';
  }

  let lastError: any = null;

  for (const modelName of CANDIDATE_TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: options.prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      activeTextModel = modelName;
      const text = response.text || '';
      const tokensEstimated = Math.ceil(text.split(/\s+/).length * 1.33);

      return {
        text,
        tokensEstimated,
        model: modelName,
      };
    } catch (error: any) {
      lastError = error;
      // If model not found (404) or unavailable (503), try next candidate model
      if (error?.status === 404 || error?.status === 503 || error?.message?.includes('not found') || error?.message?.includes('no longer available')) {
        console.warn(`[Gemini] Model ${modelName} unavailable (${error.status || error.message}), trying next candidate...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Gemini API error: ${lastError?.message || 'All candidate models failed'}`);
}

/**
 * Generate an embedding vector using the configured Gemini embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getAIInstance();
  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is required to generate embeddings. ' +
      'Set GEMINI_API_KEY in your .env file.'
    );
  }

  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  let lastError: any = null;

  for (const modelName of CANDIDATE_EMBEDDING_MODELS) {
    try {
      const response = await ai.models.embedContent({
        model: modelName,
        contents: normalizedText,
      });

      const values =
        (response as any).embedding?.values ||
        (response as any).embeddings?.[0]?.values ||
        (response as any).values;

      if (!values || !Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini API returned an empty or invalid embedding vector.');
      }

      for (let i = 0; i < values.length; i++) {
        if (typeof values[i] !== 'number' || isNaN(values[i]) || !isFinite(values[i])) {
          throw new Error(`Embedding vector contains invalid component at index ${i}: ${values[i]}`);
        }
      }

      activeEmbeddingModel = modelName;
      return values;
    } catch (error: any) {
      lastError = error;
      if (
        error?.status === 404 ||
        error?.message?.includes('not found') ||
        error?.message?.includes('not supported')
      ) {
        console.warn(`[Gemini] Embedding model ${modelName} unavailable, trying next candidate...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Gemini embedding failed: ${lastError?.message || 'All candidate embedding models failed'}`);
}

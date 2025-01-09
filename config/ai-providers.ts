export interface AIModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  fullModelName?: string;
}

export const AI_PROVIDERS: Record<string, AIModel[]> = {
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      maxTokens: 128000
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      maxTokens: 64000
    }
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      maxTokens: 200000
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      maxTokens: 200000
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      maxTokens: 200000
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      maxTokens: 200000
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      maxTokens: 200000
    }
  ],
  google: [
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      maxTokens: 1000000
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      maxTokens: 1000000
    },
    {
      id: 'gemini-1.5-flash-8b',
      name: 'Gemini 1.5 Flash-8B',
      provider: 'google',
      maxTokens: 1000000
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      maxTokens: 1000000
    }
  ],
  deepseek: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      maxTokens: 32768
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      provider: 'deepseek',
      maxTokens: 32768
    }
  ],
  ollama: []
};

export const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-2.0-flash-exp',
  deepseek: 'deepseek-chat',
  ollama: ''
};

export type EnabledProviders = {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  deepseek: boolean;
  ollama: boolean;
};

export const ENABLED_PROVIDERS: EnabledProviders = {
  openai: !!process.env.OPENAI_API_KEY,
  anthropic: !!process.env.ANTHROPIC_API_KEY,
  google: !!process.env.GOOGLE_API_KEY,
  deepseek: !!process.env.DEEPSEEK_API_KEY,
  ollama: false
};

import { fetchOllamaModels } from "../utils/ollama";

export async function initializeOllamaModels() {
  try {
    const ollamaModels = await fetchOllamaModels();
    
    if (ollamaModels.length > 0) {
      // Map Ollama models to our AIModel interface
      AI_PROVIDERS.ollama = ollamaModels.map(model => ({
        id: model.name,
        name: model.displayName, 
        provider: 'ollama',
        maxTokens: getOllamaModelMaxTokens(model.details),
        fullModelName: model.name
      }));

      // Set the first model as default if available
      if (AI_PROVIDERS.ollama.length > 0) {
        DEFAULT_MODELS.ollama = AI_PROVIDERS.ollama[0].id;
        ENABLED_PROVIDERS.ollama = true;
      }
    }
  } catch (error) {
    console.error('Error initializing Ollama:', error);
    ENABLED_PROVIDERS.ollama = false;
  }
}

// Helper function to determine max tokens based on model details
function getOllamaModelMaxTokens(details: { parameter_size?: string }): number {
  if (!details?.parameter_size) return 4096;
  
  // Extract the number from strings like "3.2B", "8B", etc.
  const sizeMatch = details.parameter_size.match(/(\d+(?:\.\d+)?)/);
  if (!sizeMatch) return 4096;
  
  const size = parseFloat(sizeMatch[1]);
  
  // Assign token limits based on model size
  if (size <= 3) return 4096;
  if (size <= 7) return 8192;
  if (size <= 13) return 16384;
  return 32768; // For larger models
}

export async function refreshOllamaModels() {
  await initializeOllamaModels();
}

// Helper function to get full model name (mainly for Ollama)
export function getModelFullName(modelId: string): string {
  const ollamaModel = AI_PROVIDERS.ollama.find(model => model.id === modelId);
  return ollamaModel?.fullModelName || modelId;
}
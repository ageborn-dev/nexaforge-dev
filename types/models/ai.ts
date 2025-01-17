export interface AIModel {
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
    fullModelName?: string;
  }
  
  export interface AISettings {
    temperature: number;
    maxTokens: number;
    topP: number;
    streamOutput: boolean;
    frequencyPenalty: number;
    presencePenalty: number;
  }
  
  export interface EnabledProviders {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    deepseek: boolean;
    ollama: boolean;
    grok: boolean;
  }
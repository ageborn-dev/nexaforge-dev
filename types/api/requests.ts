import { AISettings } from "../models/ai";

export interface GenerateCodeRequest {
    model: string;
    messages: { role: string; content: string; }[];
    settings: AISettings;
  }
  
  export interface TokenAnalyticsRequest {
    model: string;
    prompt: string;
    generatedCode: string;
    generatedAppId: string;
    ollamaResponse?: string;
  }
  
  export interface SaveGenerationRequest {
    title: string;
    description: string;
    generatedAppId: string;
  }
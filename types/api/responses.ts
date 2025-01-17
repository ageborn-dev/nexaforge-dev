export interface TokenAnalyticsResponse {
    modelName: string;
    provider: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    maxTokens: number;
    utilizationPercentage: number;
  }
  
  export interface GeneratedAppResponse {
    id: string;
    code: string;
    model: string;
    prompt: string;
  }
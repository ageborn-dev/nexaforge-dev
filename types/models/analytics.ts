export interface TokenAnalytics {
    modelName: string;
    provider: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    maxTokens: number;
    utilizationPercentage: string;
  }
  
  export interface CumulativeTokenAnalytics extends TokenAnalytics {
    cumulativePromptTokens: number;
    cumulativeResponseTokens: number;
    cumulativeTotalTokens: number;
  }
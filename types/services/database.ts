export interface GeneratedApp {
    id: string;
    model: string;
    prompt: string;
    code: string;
    createdAt: Date;
    analytics?: Analytics;
    savedApp?: SavedApp;
    sharedCode?: SharedCode;
  }
  
  export interface SavedApp {
    id: string;
    title: string;
    description?: string | null;
    generatedApp: GeneratedApp;
    appId: string;
    createdAt: Date;
  }
  
  export interface Analytics {
    id: string;
    generatedApp: GeneratedApp;
    appId: string;
    modelName: string;
    provider: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    maxTokens: number;
    utilizationPercentage: number;
    createdAt: Date;
  }

  export interface SharedCode {
    id: string;
    appId: string;
    generatedApp: GeneratedApp;
    content?: string | null;
    isEncrypted: boolean;
    expiresAt?: Date | null;
    allowedViews?: number | null;
    remainingViews?: number | null;
    createdAt: Date;
  }
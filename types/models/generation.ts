import { TokenAnalytics } from "./analytics";

export interface SavedGeneration {
    id: string;
    title: string;
    description: string | null;
    createdAt: string;
    generatedApp: {
      id: string;
      code: string;
      model: string;
      prompt: string;
      analytics: TokenAnalytics | null;
    };
  }
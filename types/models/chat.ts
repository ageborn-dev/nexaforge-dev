export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    error?: boolean;
    thinking?: boolean;
    isErrorFix?: boolean;
  }
  
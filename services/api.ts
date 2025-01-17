// /services/api.ts
import {
  // API Types
  GenerateCodeRequest,
  TokenAnalyticsRequest,
  SaveGenerationRequest,
  TokenAnalyticsResponse,
  GeneratedAppResponse,
  // Model Types
  AISettings,
  SavedGeneration,
  ChatMessage,
  CumulativeTokenAnalytics,
  // Service Types
  OllamaModel,
  ErrorFixContext,
  CodeError,
  FixAttempt
} from '@/types';

// Code Generation APIs
export const generateCode = async (params: GenerateCodeRequest): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch("/api/generateCode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok || !response.body) {
    throw new Error(response.statusText || "Failed to generate code");
  }

  return response.body;
};

export const generateIdea = async (params: { 
  model: string; 
  settings: AISettings 
}): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch("/api/generateIdea", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok || !response.body) {
    throw new Error(response.statusText || "Failed to generate idea");
  }

  return response.body;
};

export const refinePrompt = async (params: { 
  model: string; 
  prompt: string; 
  settings: AISettings 
}): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch("/api/refinePrompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok || !response.body) {
    throw new Error(response.statusText || "Failed to refine prompt");
  }

  return response.body;
};

// Analytics APIs
export const updateTokenAnalytics = async (params: TokenAnalyticsRequest): Promise<CumulativeTokenAnalytics> => {
  const response = await fetch("/api/tokenAnalytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error(`Analytics error: ${response.status}`);
  }

  const data: TokenAnalyticsResponse = await response.json();
  
  // Convert to CumulativeTokenAnalytics format
  return {
    ...data,
    utilizationPercentage: data.utilizationPercentage.toString(),
    cumulativePromptTokens: data.promptTokens,
    cumulativeResponseTokens: data.responseTokens,
    cumulativeTotalTokens: data.totalTokens
  };
};

// Saved Generations APIs
export const fetchSavedGenerations = async (): Promise<SavedGeneration[]> => {
  const response = await fetch('/api/saved-generations');
  if (!response.ok) {
    throw new Error('Failed to fetch saved generations');
  }
  return response.json();
};

export const saveGeneration = async (params: SaveGenerationRequest): Promise<SavedGeneration> => {
  const response = await fetch('/api/saved-generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to save generation');
  }

  return response.json();
};

export const deleteGeneration = async (id: string): Promise<void> => {
  const response = await fetch(`/api/saved-generations?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete generation');
  }
};

// Generated App APIs
export const saveGeneratedApp = async (params: {
  model: string;
  prompt: string;
  code: string;
}): Promise<GeneratedAppResponse> => {
  const response = await fetch("/api/generated-apps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Failed to save generated app");
  }

  return response.json();
};

// Model Management APIs
export const checkOllamaAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
};

export const fetchOllamaModelList = async (): Promise<OllamaModel[]> => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return [];
  }
};

// Error Fix APIs
export const generateErrorFix = async (params: ErrorFixContext): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch("/api/fixError", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok || !response.body) {
    throw new Error(response.statusText || "Failed to generate error fix");
  }

  return response.body;
};

// Stream Processing Utilities
export const streamReader = async <T>(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: T) => void,
  transform?: (chunk: string) => T
): Promise<void> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      if (transform) {
        onChunk(transform(chunk));
      } else {
        onChunk(chunk as T);
      }
    }
  } finally {
    reader.releaseLock();
  }
};

// Chat Message Processing
export const processChatMessage = async (params: {
  model: string;
  messages: ChatMessage[];
  settings: AISettings;
}): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok || !response.body) {
    throw new Error(response.statusText || "Failed to process chat message");
  }

  return response.body;
};

// Validation Helpers
export const validateResponse = (response: Response, errorMessage: string): Promise<Response> => {
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return Promise.resolve(response);
};

// Error Fix Analysis
export const analyzeError = async (params: ErrorFixContext): Promise<CodeError> => {
  const response = await fetch("/api/analyzeError", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error("Failed to analyze error");
  }

  return response.json();
};

// Complete Fix Attempt with Analysis
export const getCompleteErrorFix = async (params: ErrorFixContext): Promise<FixAttempt> => {
  const response = await fetch("/api/completeErrorFix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error("Failed to get complete error fix");
  }

  return response.json();
};

// Get Fix Without Streaming
export const getFixWithoutStreaming = async (params: ErrorFixContext): Promise<string> => {
  const response = await fetch("/api/fixError", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-Stream-Response": "false"
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error("Failed to get error fix");
  }

  return response.text();
};

// Stream Fix With Analysis
export const streamFixWithAnalysis = async (
  params: ErrorFixContext,
  onAnalysis: (analysis: CodeError) => void,
  onFixChunk: (chunk: string) => void
): Promise<FixAttempt> => {
  const analysis = await analyzeError(params);
  onAnalysis(analysis);

  const fixStream = await generateErrorFix(params);
  let fixedCode = '';

  await streamReader(
    fixStream,
    (chunk: string) => {
      fixedCode += chunk;
      onFixChunk(chunk);
    }
  );

  return {
    original_error: analysis,
    fix_successful: true,
    fixed_code: fixedCode,
    remaining_issues: [],
    next_steps: []
  };
};

export function parseOllamaResponse(responseText: string) {
  try {
    const jsonStrings = responseText.trim().split('\n');
    const jsonObjects = jsonStrings
      .filter(str => str.trim())
      .map(str => JSON.parse(str));

    const statsObject = jsonObjects[jsonObjects.length - 1];
    
    if (statsObject && 'total_duration' in statsObject) {
      return {
        promptTokens: statsObject.prompt_eval_count || 0,
        responseTokens: statsObject.eval_count || 0,
        totalTokens: (statsObject.prompt_eval_count || 0) + (statsObject.eval_count || 0),
        context: statsObject.context?.length || 0
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing Ollama response:', error);
    return null;
  }
}

export function getProviderFromModel(model: string): [string, any[]] | null {
  if (model.includes(':') || model.startsWith('ollama/')) {
    return ['ollama', []]; // AI_PROVIDERS.ollama will be handled by the caller
  }

  return null; // Other providers handled by caller
}

export function estimateTokens(text: string, provider: string, ollamaResponse?: string) {
  if (!text) return 0;
  
  switch (provider) {
    case 'openai':
    case 'deepseek':
    case 'grok':
      return Math.ceil(text.length / 4); // Simple estimation
    case 'anthropic':
      return Math.ceil((text.length / 4) * 1.1);
    case 'google':
      return Math.ceil(text.length / 4);
    case 'ollama': {
      if (ollamaResponse) {
        const stats = parseOllamaResponse(ollamaResponse);
        if (stats) return stats.totalTokens;
      }
      return Math.ceil(text.length / 4);
    }
    default:
      return 0;
  }
}

// Ollama Utilities
export function createOllamaRequest(model: string, prompt: string, settings?: {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  streamOutput?: boolean;
  frequencyPenalty?: number;
  presencePenalty?: number;
}) {
  const requestBody = {
    model,
    prompt,
    stream: true,
    options: {
      temperature: settings?.temperature ?? 0.7,
      top_p: settings?.topP ?? 1,
      num_predict: settings?.maxTokens,
      frequency_penalty: settings?.frequencyPenalty,
      presence_penalty: settings?.presencePenalty
    }
  };

  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  };
}

export async function handleOllamaStream(
  response: Response, 
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  processResponse?: (text: string) => string
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get reader from Ollama response");
  }

  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      const lines = text.split("\n").filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.error) {
            throw new Error(data.error);
          }
          if (data.response) {
            if (processResponse) {
              buffer += data.response;
              if (buffer.length > 100) {
                controller.enqueue(encoder.encode(processResponse(buffer)));
                buffer = "";
              }
            } else {
              controller.enqueue(encoder.encode(data.response));
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
            console.error("Error parsing Ollama response:", e);
          }
        }
      }
    }

    if (buffer && processResponse) {
      controller.enqueue(encoder.encode(processResponse(buffer)));
    }
  } finally {
    reader.releaseLock();
  }
}

// Error Fix Utils
export function formatErrorContext(
  code: string,
  error: string,
  errorDetails?: { line?: number; column?: number }
): string {
  let context = `Code:\n${code}\n\nError:\n${error}`;
  
  if (errorDetails?.line) {
    const lines = code.split('\n');
    const startLine = Math.max(0, errorDetails.line - 2);
    const endLine = Math.min(lines.length, errorDetails.line + 2);
    const relevantLines = lines.slice(startLine, endLine);
    
    context += '\n\nRelevant section:\n';
    relevantLines.forEach((line, idx) => {
      const lineNum = startLine + idx + 1;
      const marker = lineNum === errorDetails.line ? '> ' : '  ';
      context += `${marker}${lineNum}: ${line}\n`;
    });
  }

  return context;
}

export function parseErrorDetails(error: string): { 
  line?: number;
  column?: number;
  message: string;
} {
  const lineMatch = error.match(/line (\d+)/i);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

  const columnMatch = error.match(/column (\d+)/i);
  const column = columnMatch ? parseInt(columnMatch[1], 10) : undefined;

  const message = error
    .replace(/\(line \d+(?:, column \d+)?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { line, column, message };
}
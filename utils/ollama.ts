interface OllamaSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  streamOutput?: boolean;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface OllamaModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

interface OllamaModel {
  name: string; 
  displayName: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

interface OllamaModelsResponse {
  models: Array<{
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: OllamaModelDetails;
  }>;
}

function formatDisplayName(modelName: string): string {
  // Remove :latest suffix
  let name = modelName.replace(/:latest$/, '');
  
  // Split on special characters
  const parts = name.split(/[-_:]/);
  
  // Capitalize each part and handle special cases
  return parts
    .map(part => {
      // Handle version numbers (e.g., llama3.2 -> Llama 3.2)
      const versionMatch = part.match(/([a-zA-Z]+)(\d+\.?\d*)/);
      if (versionMatch) {
        const [, text, version] = versionMatch;
        return text.charAt(0).toUpperCase() + text.slice(1) + ' ' + version;
      }
      // Regular word capitalization
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

export async function fetchOllamaModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
    }

    const data: OllamaModelsResponse = await response.json();
    
    return data.models.map(model => ({
      ...model,
      displayName: formatDisplayName(model.name)
    }));
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return [];
  }
}

export function createOllamaRequest(model: string, prompt: string, settings?: OllamaSettings) {
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

// Helper function to check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to get model by name
export function findModelByDisplayName(models: OllamaModel[], displayName: string): OllamaModel | undefined {
  return models.find(model => model.displayName === displayName);
}
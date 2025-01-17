export interface OllamaSettings {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    streamOutput?: boolean;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }
  
  export interface OllamaModelDetails {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  }
  
  export interface OllamaModel {
    name: string;
    displayName: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: OllamaModelDetails;
  }
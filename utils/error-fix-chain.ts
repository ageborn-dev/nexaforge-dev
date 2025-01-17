import { ChatGroq } from '@langchain/groq';
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { 
  errorFixingParser, 
  formatErrorContext, 
  type CodeError,
  type FixAttempt 
} from "./error-fix-schema";

interface ErrorFixOptions {
  provider: string;
  model: string;
  apiKey: string;
  code: string;
  error: string;
  errorDetails?: {
    line?: number;
    column?: number;
  };
}

// Initial system prompt for error analysis
const errorAnalysisPrompt = new PromptTemplate({
  template: `You are an expert TypeScript and React developer analyzing code errors.

Code Context:
{context}

Analyze this error and provide structured output detailing:
1. Error type and classification
2. Exact location if known
3. Most likely cause
4. Recommended fix with explanation
5. Confidence level in the solution (0-1)

Focus on providing actionable, specific fixes that maintain type safety and React best practices.
Do not include any explanatory text, only return the structured data as specified.

{format_instructions}`,
  inputVariables: ["context"],
  partialVariables: {
    format_instructions: errorFixingParser.getFormatInstructions(),
  },
});

// Prompt for the actual fix attempt
const fixingPrompt = new PromptTemplate({
  template: `You are an expert at fixing TypeScript and React code errors.
Previous fix attempts and their results are in the conversation history.

Current Error Analysis:
{error_analysis}

Task: Fix the code based on this analysis.
- Return ONLY the complete fixed code
- Include ALL necessary imports
- Follow TypeScript and React best practices
- Do not include explanations or markdown formatting
- Ensure the fix addresses the root cause while maintaining existing functionality

Original Code:
{code}`,
  inputVariables: ["error_analysis", "code"],
});

class ErrorFixingChain {
  private llmChain: RunnableSequence;
  private provider: string;
  private streamEnabled: boolean;

  constructor(private options: ErrorFixOptions) {
    this.provider = options.provider;
    this.streamEnabled = true;
    const llm = this.initializeLLM();
    this.llmChain = RunnableSequence.from([
      errorAnalysisPrompt,
      llm,
      errorFixingParser
    ]);
  }

  private initializeLLM() {
    const { provider, model } = this.options;
    const commonConfig = {
      modelName: model,
      streaming: this.streamEnabled,
      temperature: 0.2,
      maxTokens: undefined,
    };

    switch (provider) {
      case "openai": {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI API key not configured");
        return new ChatOpenAI({
          ...commonConfig,
          openAIApiKey: apiKey,
          modelName: model,
        });
      }

      case "anthropic": {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("Anthropic API key not configured");
        return new ChatAnthropic({
          ...commonConfig,
          anthropicApiKey: apiKey,
        });
      }

      case "google": {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("Google API key not configured");
        return new ChatGoogleGenerativeAI({
          ...commonConfig,
          apiKey: apiKey,
        });
      }

      case "grok": {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) throw new Error("xAI API key not configured");
        return new ChatGroq({
          ...commonConfig,
          apiKey: apiKey,
          modelName: model,
          temperature: 0.2,
        });
      }

      case "ollama": {
        return new ChatOllama({
          baseUrl: "http://localhost:11434",
          model: model,
          temperature: 0.2,
          maxRetries: 2,
          streaming: true
        });
      }

      case "deepseek": {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("DeepSeek API key not configured");
        return new ChatOpenAI({
          ...commonConfig,
          openAIApiKey: apiKey,
          modelName: model,
          configuration: {
            baseURL: "https://api.deepseek.com/v1"
          }
        });
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async analyzeError(): Promise<CodeError> {
    const { code, error, errorDetails } = this.options;
    const context = formatErrorContext(code, error, errorDetails);

    try {
      const analysis = await this.llmChain.invoke({ context });
      return analysis.original_error;
    } catch (error) {
      console.error("Error in analysis chain:", error);
      throw error;
    }
  }

  public async *streamFix(): AsyncGenerator<string> {
    try {
      // First analyze the error
      const analysis = await this.analyzeError();
      
      // Create fixing chain with the analysis results
      const fixChain = RunnableSequence.from([
        fixingPrompt,
        this.initializeLLM(),
        new StringOutputParser()
      ]);

      // Stream the fix
      const stream = await fixChain.stream({
        error_analysis: JSON.stringify(analysis, null, 2),
        code: this.options.code
      });

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      console.error("Error in fix chain:", error);
      throw error;
    }
  }

  // Method for non-streaming response if needed
  public async getFix(): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamFix()) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

export const createErrorFixer = async (options: ErrorFixOptions) => {
  const chain = new ErrorFixingChain(options);
  return chain.streamFix();
};

export const getFixWithoutStreaming = async (options: ErrorFixOptions) => {
  const chain = new ErrorFixingChain(options);
  return chain.getFix();
};

// Export types for use in other components
export type { ErrorFixOptions, CodeError, FixAttempt };

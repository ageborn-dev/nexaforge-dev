import { AI_PROVIDERS } from "../../../config/ai-providers";
import { encode } from 'gpt-tokenizer';
import prisma from '@/lib/prisma';

function parseOllamaResponse(responseText: string) {
  try {
    // Split response into individual JSON objects
    const jsonStrings = responseText.trim().split('\n');
    const jsonObjects = jsonStrings
      .filter(str => str.trim())
      .map(str => JSON.parse(str));

    // Get the last object with completion statistics
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

function getProviderFromModel(model: string): [string, any[]] | null {
  // Special handling for Ollama models
  if (model.includes(':') || model.startsWith('ollama/')) {
    return ['ollama', AI_PROVIDERS.ollama];
  }

  // Check other providers
  return Object.entries(AI_PROVIDERS).find(([_, models]) => 
    models.some(m => m.id === model)
  ) || null;
}

function estimateTokens(text: string, provider: string, ollamaResponse?: string) {
  if (!text) return 0;
  
  switch (provider) {
    case 'openai':
    case 'deepseek':
    case 'grok':
      return encode(text).length;
    case 'anthropic':
      return Math.ceil(encode(text).length * 1.1);
    case 'google':
      return Math.ceil(text.length / 4);
    case 'ollama': {
      if (ollamaResponse) {
        const stats = parseOllamaResponse(ollamaResponse);
        if (stats) return stats.totalTokens;
      }
      // Fallback to rough estimation
      return Math.ceil(text.length / 4);
    }
    default:
      return 0;
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    
    if (!json?.model || !json?.generatedCode || !json?.prompt || !json?.generatedAppId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: {
          hasModel: !!json?.model,
          hasCode: !!json?.generatedCode,
          hasPrompt: !!json?.prompt,
          hasAppId: !!json?.generatedAppId
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { model, generatedCode, prompt, generatedAppId, ollamaResponse } = json;

    // Find provider using the new helper function
    const providerInfo = getProviderFromModel(model);
    
    if (!providerInfo) {
      return new Response(JSON.stringify({
        error: 'Invalid model selected',
        model: model
      }), { status: 400 });
    }

    const [provider, models] = providerInfo;

    // For Ollama, create a basic model info if not found
    let modelInfo = models.find(m => m.id === model);
    if (provider === 'ollama' && !modelInfo) {
      modelInfo = {
        id: model,
        name: model.split('/').pop()?.split(':')[0] || model,
        maxTokens: 4096 // Default max tokens for Ollama models
      };
    }

    if (!modelInfo) {
      return new Response(JSON.stringify({
        error: 'Model not found',
        model: model
      }), { status: 404 });
    }

    // Calculate tokens based on provider
    let promptTokens, responseTokens, totalTokens;

    if (provider === 'ollama' && ollamaResponse) {
      const stats = parseOllamaResponse(ollamaResponse);
      if (stats) {
        promptTokens = stats.promptTokens;
        responseTokens = stats.responseTokens;
        totalTokens = stats.totalTokens;
      } else {
        promptTokens = estimateTokens(prompt, provider);
        responseTokens = estimateTokens(generatedCode, provider);
        totalTokens = promptTokens + responseTokens;
      }
    } else {
      promptTokens = estimateTokens(prompt, provider);
      responseTokens = estimateTokens(generatedCode, provider);
      totalTokens = promptTokens + responseTokens;
    }

    const utilizationPercentage = parseFloat(((totalTokens / modelInfo.maxTokens) * 100).toFixed(2));

    // Create or update analytics
    const analytics = await prisma.analytics.upsert({
      where: {
        appId: generatedAppId,
      },
      update: {
        modelName: modelInfo.name,
        provider,
        promptTokens,
        responseTokens,
        totalTokens,
        maxTokens: modelInfo.maxTokens,
        utilizationPercentage
      },
      create: {
        appId: generatedAppId,
        modelName: modelInfo.name,
        provider,
        promptTokens,
        responseTokens,
        totalTokens,
        maxTokens: modelInfo.maxTokens,
        utilizationPercentage
      }
    });

    return new Response(JSON.stringify({
      modelName: modelInfo.name,
      provider,
      promptTokens,
      responseTokens,
      totalTokens,
      maxTokens: modelInfo.maxTokens,
      utilizationPercentage
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
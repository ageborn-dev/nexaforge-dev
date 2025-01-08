import { AI_PROVIDERS } from "../../../config/ai-providers";
import { encode } from 'gpt-tokenizer';
import { z } from "zod";
import prisma from '@/lib/prisma';

function estimateTokens(text: string, provider: string) {
  if (!text) return 0;
  
  switch (provider) {
    case 'openai':
    case 'deepseek':
      return encode(text).length;
    case 'anthropic':
      return Math.ceil(encode(text).length * 1.1);
    case 'google':
      return Math.ceil(text.length / 4);
    default:
      return 0;
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    
    // Simple validation for required fields
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

    const { model, generatedCode, prompt, generatedAppId } = json;

    // Find the provider and model details
    const providerEntry = Object.entries(AI_PROVIDERS).find(([_, models]) => 
      models.some(m => m.id === model)
    );

    if (!providerEntry) {
      return new Response(JSON.stringify({
        error: 'Invalid model selected'
      }), { status: 400 });
    }

    const [provider, models] = providerEntry;
    const modelInfo = models.find(m => m.id === model);

    if (!modelInfo) {
      return new Response(JSON.stringify({
        error: 'Model not found'
      }), { status: 404 });
    }

    // Calculate tokens
    const promptTokens = estimateTokens(prompt, provider);
    const responseTokens = estimateTokens(generatedCode, provider);
    const totalTokens = promptTokens + responseTokens;
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
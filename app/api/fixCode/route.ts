import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AI_PROVIDERS } from "../../../config/ai-providers";

// Initialize API clients
const googleApiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(googleApiKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/',
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = z.object({
      model: z.string(),
      code: z.string(),
      error: z.string(),
      settings: z.object({
        temperature: z.number(),
        maxTokens: z.number(),
        topP: z.number(),
        frequencyPenalty: z.number().optional(),
        presencePenalty: z.number().optional(),
      }).optional(),
      errorDetails: z.object({
        line: z.number().optional(),
        column: z.number().optional(),
      }).optional(),
    }).safeParse(json);

    if (!result.success) {
      return new Response(result.error.message, { status: 400 });
    }

    const { model, code, error, settings, errorDetails } = result.data;
    const providerEntry = Object.entries(AI_PROVIDERS).find(([_, models]) => 
      models.some(m => m.id === model)
    );

    if (!providerEntry) {
      return new Response("Invalid model selected", { status: 400 });
    }

    const [provider] = providerEntry;

    const fixPrompt = `As an expert React developer, please fix the following code that has an error. 
Error details:
- Message: ${error}
${errorDetails?.line ? `- Line: ${errorDetails.line}` : ''}
${errorDetails?.column ? `- Column: ${errorDetails.column}` : ''}

Here's the code:
${code}

Please analyze the error carefully and provide ONLY the fixed code without any explanations or markdown formatting. The response should start directly with the imports and contain only the corrected code.`;

    let stream: ReadableStream;
    const encoder = new TextEncoder();

    switch (provider) {
      case "google": {
        const geminiModel = genAI.getGenerativeModel({ model });
        const geminiStream = await geminiModel.generateContentStream(fixPrompt);
        stream = new ReadableStream({
          async start(controller) {
            try {
              let buffer = '';
              for await (const chunk of geminiStream.stream) {
                buffer += chunk.text();
                controller.enqueue(encoder.encode(buffer));
                buffer = '';
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
        break;
      }

      case "openai": {
        const openaiStream = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: fixPrompt }],
          stream: true,
          temperature: settings?.temperature ?? 0.7,
          max_tokens: settings?.maxTokens,
          top_p: settings?.topP ?? 1,
          frequency_penalty: settings?.frequencyPenalty ?? 0,
          presence_penalty: settings?.presencePenalty ?? 0,
        });
        
        stream = new ReadableStream({
          async start(controller) {
            try {
              let buffer = '';
              for await (const chunk of openaiStream) {
                if (chunk.choices[0]?.delta?.content) {
                  buffer += chunk.choices[0].delta.content;
                  if (buffer.length > 100) {
                    controller.enqueue(encoder.encode(buffer));
                    buffer = '';
                  }
                }
              }
              if (buffer) {
                controller.enqueue(encoder.encode(buffer));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
        break;
      }

      case "anthropic": {
        const anthropicStream = await anthropic.messages.create({
          model,
          max_tokens: settings?.maxTokens,
          messages: [{ role: "user", content: fixPrompt }],
          stream: true,
          temperature: settings?.temperature ?? 0.7,
          top_p: settings?.topP ?? 1,
        });
        
        stream = new ReadableStream({
          async start(controller) {
            try {
              let buffer = '';
              for await (const chunk of anthropicStream) {
                if (chunk.type === "content_block_delta" && chunk.delta?.text) {
                  buffer += chunk.delta.text;
                  if (buffer.length > 100) {
                    controller.enqueue(encoder.encode(buffer));
                    buffer = '';
                  }
                }
              }
              if (buffer) {
                controller.enqueue(encoder.encode(buffer));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
        break;
      }

      case "deepseek": {
        const response = await deepseek.chat.completions.create({
          model,
          messages: [{ role: "user", content: fixPrompt }],
          stream: true,
          temperature: settings?.temperature ?? 0,
          max_tokens: settings?.maxTokens,
          top_p: settings?.topP ?? 1,
        });
        
        stream = new ReadableStream({
          async start(controller) {
            try {
              let buffer = '';
              let lastEnqueueTime = Date.now();
              
              for await (const chunk of response) {
                if (chunk.choices[0]?.delta?.content) {
                  buffer += chunk.choices[0].delta.content;
                  
                  const now = Date.now();
                  if (now - lastEnqueueTime >= 100 && buffer.length > 0) {
                    controller.enqueue(encoder.encode(buffer));
                    buffer = '';
                    lastEnqueueTime = now;
                  }
                }
              }
              
              if (buffer) {
                controller.enqueue(encoder.encode(buffer));
              }
              
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
        break;
      }

      default:
        return new Response("Unsupported provider", { status: 400 });
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error fixing code:", error);
    return new Response(
      `Error fixing code: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export const runtime = "edge";
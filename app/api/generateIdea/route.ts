import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  AI_PROVIDERS,
  initializeOllamaModels,
} from "../../../config/ai-providers";
import { createOllamaRequest, handleOllamaStream } from "../../../utils/ollama";

// Initialize API clients
const googleApiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(googleApiKey);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});
const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY || "",
});

const systemPrompt = `Generate a creative app idea in the following format EXACTLY:
"Build me a [type] app that [brief description of main functionality]"

For example:
"Build me a fitness tracking app that uses gamification to motivate users"
"Build me a recipe management app that suggests meals based on available ingredients"

The app idea should be:
- Practical and feasible to implement
- Solving a real problem or fulfilling a need
- Clear and straightforward
- Specific enough to generate code from

Return ONLY the formatted prompt, nothing else. Always start with "Build me a" and follow the format above.`;

export async function POST(req: Request) {
  let json = await req.json();
  console.log("=== Route Debug ===");
  console.log("Received model:", json.model);
  console.log("AI_PROVIDERS state:", {
    ollama: AI_PROVIDERS.ollama,
    modelIds: AI_PROVIDERS.ollama.map((m) => m.id),
  });
  let result = z
    .object({
      model: z.string(),
      settings: z
        .object({
          temperature: z.number(),
          maxTokens: z.number(),
          topP: z.number(),
          streamOutput: z.boolean(),
          frequencyPenalty: z.number(),
          presencePenalty: z.number(),
        })
        .optional(),
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  let { model, settings } = result.data;
  const ideaPrompt =
    "Generate a creative and unique app idea that is practical, innovative, and solves a real problem.";

  await initializeOllamaModels();

  console.log("=== Model Validation Debug ===");
  console.log("Received model:", model);
  console.log("AI_PROVIDERS after init:", {
    providers: Object.keys(AI_PROVIDERS),
    ollamaModels: AI_PROVIDERS.ollama.map((m) => ({ id: m.id, name: m.name })),
  });
  console.log(
    "Model exists in Ollama:",
    AI_PROVIDERS.ollama.some((m) => m.id === model),
  );

  const providerEntry = Object.entries(AI_PROVIDERS).find(([_, models]) =>
    models.some((m) => m.id === model),
  );

  if (!providerEntry) {
    return new Response("Invalid model selected", { status: 400 });
  }

  const [provider] = providerEntry;

  try {
    let stream: ReadableStream;
    const encoder = new TextEncoder();

    switch (provider) {
      case "google":
        const geminiModel = genAI.getGenerativeModel({ model });
        const geminiStream = await geminiModel.generateContentStream([
          { text: systemPrompt },
          { text: ideaPrompt },
        ]);
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of geminiStream.stream) {
              controller.enqueue(encoder.encode(chunk.text()));
            }
            controller.close();
          },
        });
        break;

      case "openai":
        const openaiStream = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: ideaPrompt },
          ],
          stream: true,
          temperature: settings?.temperature ?? 0.9,
        });
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of openaiStream) {
              if (chunk.choices[0]?.delta?.content) {
                controller.enqueue(
                  encoder.encode(chunk.choices[0].delta.content),
                );
              }
            }
            controller.close();
          },
        });
        break;

      case "anthropic":
        const anthropicStream = await anthropic.messages.create({
          model,
          max_tokens: 1000,
          messages: [
            { role: "user", content: systemPrompt + "\n\n" + ideaPrompt },
          ],
          stream: true,
        });
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of anthropicStream) {
              if (chunk.type === "content_block_delta" && 'text' in chunk.delta) {
                if ('text' in chunk.delta) {
                  controller.enqueue(encoder.encode(chunk.delta.text));
                }
              }
            }
            controller.close();
          },
        });
        break;

      case "deepseek":
        const deepseekStream = await deepseek.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: ideaPrompt },
          ],
          stream: true,
          temperature: 0.9,
        });
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of deepseekStream) {
              if (chunk.choices[0]?.delta?.content) {
                controller.enqueue(
                  encoder.encode(chunk.choices[0].delta.content),
                );
              }
            }
            controller.close();
          },
        });
        break;

      case "grok":
        const grokStream = await grok.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: ideaPrompt },
          ],
          stream: true,
          temperature: 0.9,
        });
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of grokStream) {
              if (chunk.choices[0]?.delta?.content) {
                controller.enqueue(
                  encoder.encode(chunk.choices[0].delta.content),
                );
              }
            }
            controller.close();
          },
        });
        break;

      case "ollama":
        console.log("Creating Ollama request with model:", model);
        const ollamaResponse = await fetch(
          "http://localhost:11434/api/generate",
          createOllamaRequest(
            model,
            systemPrompt + "\n\n" + ideaPrompt,
            settings,
          ),
        );

        if (!ollamaResponse.ok) {
          const errorData = await ollamaResponse.text();
          console.error("Ollama error response:", errorData);
          throw new Error(`Ollama API request failed: ${errorData}`);
        }

        stream = new ReadableStream({
          async start(controller) {
            await handleOllamaStream(ollamaResponse, controller, encoder);
            controller.close();
          },
        });
        break;

      default:
        return new Response("Unsupported provider", { status: 400 });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating idea:", error);
    return new Response(
      `Error generating idea: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}

export const runtime = "edge";

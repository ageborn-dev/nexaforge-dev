import dedent from "dedent";
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
  baseURL: "https://api.deepseek.com/",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// Helper function to clean code text
function cleanCodeText(text: string): string {
  // Remove code block markers if present
  text = text.replace(/```[\w]*\n?/g, "");
  // Ensure proper export syntax
  if (!text.includes("export default")) {
    text = text.replace(
      /^(const|function|class)\s+(\w+)/,
      "export default $1 $2",
    );
  }
  return text.trim();
}

export async function POST(req: Request) {
  let json = await req.json();
  let result = z
    .object({
      model: z.string(),
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      ),
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

  let { model, messages, settings } = result.data;
  let systemPrompt = getSystemPrompt();
  const prompt = messages[0].content;

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
  
  // Find the provider and model details
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
    const decoder = new TextDecoder();

    switch (provider) {
      case "google":
        const geminiModel = genAI.getGenerativeModel({ model });
        const geminiStream = await geminiModel.generateContentStream(
          prompt +
            systemPrompt +
            "\nPlease ONLY return code, NO backticks or language names. Don't start with ```typescript or ```javascript or ```tsx or ```.",
        );
        stream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            for await (const chunk of geminiStream.stream) {
              buffer += chunk.text();
              controller.enqueue(encoder.encode(cleanCodeText(buffer)));
              buffer = "";
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
            { role: "user", content: prompt },
          ],
          stream: true,
          temperature: 0.7,
        });
        stream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            for await (const chunk of openaiStream) {
              if (chunk.choices[0]?.delta?.content) {
                buffer += chunk.choices[0].delta.content;
                if (buffer.length > 100) {
                  controller.enqueue(encoder.encode(cleanCodeText(buffer)));
                  buffer = "";
                }
              }
            }
            if (buffer) {
              controller.enqueue(encoder.encode(cleanCodeText(buffer)));
            }
            controller.close();
          },
        });
        break;

      case "anthropic":
        const anthropicStream = await anthropic.messages.create({
          model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt + systemPrompt }],
          stream: true,
        });
        stream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            for await (const chunk of anthropicStream) {
              if (chunk.type === "content_block_delta" && chunk.delta?.text) {
                buffer += chunk.delta.text;
                if (buffer.length > 100) {
                  controller.enqueue(encoder.encode(cleanCodeText(buffer)));
                  buffer = "";
                }
              }
            }
            if (buffer) {
              controller.enqueue(encoder.encode(cleanCodeText(buffer)));
            }
            controller.close();
          },
        });
        break;

      case "deepseek":
        const response = await deepseek.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          stream: true,
          temperature: 0.0,
        });

        stream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            let lastEnqueueTime = Date.now();

            try {
              for await (const chunk of response) {
                if (chunk.choices[0]?.delta?.content) {
                  buffer += chunk.choices[0].delta.content;

                  const now = Date.now();
                  if (now - lastEnqueueTime >= 100 && buffer.length > 0) {
                    controller.enqueue(encoder.encode(cleanCodeText(buffer)));
                    buffer = "";
                    lastEnqueueTime = now;
                  }
                }
              }

              if (buffer) {
                controller.enqueue(encoder.encode(cleanCodeText(buffer)));
              }

              controller.close();
            } catch (error) {
              console.error("DeepSeek streaming error:", error);
              controller.error(error);
            }
          },
        });
        break;

      case "ollama":
        
        const ollamaResponse = await fetch(
          "http://localhost:11434/api/generate",
          createOllamaRequest(
            model,
            prompt +
              systemPrompt +
              "\nPlease ONLY return code, NO backticks or language names.",
            settings,
          ),
        );

        if (!ollamaResponse.ok) {
          const errorData = await ollamaResponse.text();
          console.error("Ollama error:", errorData);
          throw new Error(`Ollama API request failed: ${errorData}`);
        }

        stream = new ReadableStream({
          async start(controller) {
            await handleOllamaStream(
              ollamaResponse,
              controller,
              encoder,
              cleanCodeText,
            );
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
    console.error("Error generating code:", error);
    return new Response(
      `Error generating code: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}

function getSystemPrompt() {
  let systemPrompt = `You are an expert frontend React engineer who is also a great UI/UX designer. Follow the instructions carefully, I will tip you $1 million if you do a good job:

- Think carefully step by step about building the most user-friendly and beautiful version of what was requested
- Create a React component with zero required props that runs completely standalone
- Make the component fully interactive with proper state management and event handlers
- Add engaging animations and transitions where appropriate
- Include proper loading states and error handling
- Make it mobile-responsive with a great experience on all devices
- Add helpful hover states and visual feedback for interactions

Technical Requirements:
- Import React hooks directly (useState, useEffect, etc.)
- Use TypeScript with proper types and interfaces
- Use only standard Tailwind classes for styling - NO ARBITRARY VALUES like h-[600px]
- Use proper margin/padding classes for consistent spacing
- Use a beautiful and consistent color palette
- Always include export default for the main component
- Handle all edge cases and loading states

Formatting Requirements:
- Start directly with imports, no explanations or comments
- No markdown code blocks or backticks
- No typescript/javascript/tsx tags
- Just clean, working React code

Available Libraries:
- React core library only
- Recharts ONLY for dashboards/charts/graphs:
  import { LineChart, XAxis, ... } from "recharts"
  <LineChart ...><XAxis dataKey="name"> ...

For Images:
- Use placeholder: <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />

NO OTHER LIBRARIES ARE ALLOWED (e.g. zod, hookform)
ENSURE THE COMPONENT IS BEAUTIFUL AND FULLY FUNCTIONAL`;

  return dedent(systemPrompt);
}

export const runtime = "edge";

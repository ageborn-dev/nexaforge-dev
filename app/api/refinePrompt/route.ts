// app/api/refinePrompt/route.ts
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
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

const systemPrompt = `Refine app development prompts by:
- Defining a clear, focused app purpose
- Specifying core features suitable for React
- Emphasizing user interaction and interface
- Ensuring concept is implementable in a single-page React application

Examples:

1. Original: "Build a fitness tracking app"
Refined: Create a React app that tracks daily exercises, displays workout progress with charts, and allows users to log and compare fitness activities.

2. Original: "Create a language learning tool"
Refined: Develop a React-based vocabulary learning app with interactive flashcard practice, simple quiz mechanism, and progress tracking using local storage.

3. Original: "Make a personal finance management tool"
Refined: Build a React expense tracker that enables users to input transactions, categorize spending, and visualize monthly budget allocations through interactive charts.

Return only the prompt without Refined all other texts and "". Clear prompt only.
DO NOT generate any code. Focus only on improving the prompt text to better describe the desired functionality and requirements`;

export async function POST(req: Request) {
  let json = await req.json();
  let result = z
    .object({
      model: z.string(),
      prompt: z.string(),
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  let { model, prompt } = result.data;
  const refinementPrompt = `Please refine and improve this app idea prompt to be more specific and detailed: "${prompt}"`;

  // Find provider based on model ID
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
          { text: refinementPrompt },
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
            { role: "user", content: refinementPrompt },
          ],
          stream: true,
          temperature: 0.7,
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
            { role: "user", content: systemPrompt + "\n\n" + refinementPrompt },
          ],
          stream: true,
        });
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of anthropicStream) {
              if (chunk.type === "content_block_delta" && chunk.delta?.text) {
                controller.enqueue(encoder.encode(chunk.delta.text));
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
            { role: "user", content: refinementPrompt },
          ],
          stream: true,
          temperature: 0.7,
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
    console.error("Error refining prompt:", error);
    return new Response(
      `Error refining prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}

export const runtime = "edge";

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
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || "",
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
  let result = z
    .object({
      model: z.string(),
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  let { model } = result.data;
  const ideaPrompt = "Generate a creative and unique app idea that is practical, innovative, and solves a real problem.";

  // Find provider based on model ID
  const providerEntry = Object.entries(AI_PROVIDERS).find(([_, models]) => 
    models.some(m => m.id === model)
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
          { text: ideaPrompt }
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
            { role: "user", content: ideaPrompt }
          ],
          stream: true,
          temperature: 0.9,
        });
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of openaiStream) {
              if (chunk.choices[0]?.delta?.content) {
                controller.enqueue(encoder.encode(chunk.choices[0].delta.content));
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
            { role: "user", content: systemPrompt + "\n\n" + ideaPrompt }
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
            { role: "user", content: ideaPrompt }
          ],
          stream: true,
          temperature: 0.9,
        });
        
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of deepseekStream) {
              if (chunk.choices[0]?.delta?.content) {
                controller.enqueue(encoder.encode(chunk.choices[0].delta.content));
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
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating idea:', error);
    return new Response(
      `Error generating idea: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

export const runtime = "edge";
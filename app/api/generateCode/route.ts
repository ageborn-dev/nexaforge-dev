import dedent from "dedent";
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

// Initialize DeepSeek client using OpenAI SDK
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/',
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// Helper function to clean code text
function cleanCodeText(text: string): string {
  // Remove code block markers if present
  text = text.replace(/```[\w]*\n?/g, '');
  // Ensure proper export syntax
  if (!text.includes('export default')) {
    text = text.replace(/^(const|function|class)\s+(\w+)/, 'export default $1 $2');
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
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  let { model, messages } = result.data;
  let systemPrompt = getSystemPrompt();
  const prompt = messages[0].content;

  // Find the provider and model details
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
    const decoder = new TextDecoder();

    switch (provider) {
      case "google":
        const geminiModel = genAI.getGenerativeModel({ model });
        const geminiStream = await geminiModel.generateContentStream(
          prompt + systemPrompt + "\nPlease ONLY return code, NO backticks or language names. Don't start with ```typescript or ```javascript or ```tsx or ```."
        );
        stream = new ReadableStream({
          async start(controller) {
            let buffer = '';
            for await (const chunk of geminiStream.stream) {
              buffer += chunk.text();
              controller.enqueue(encoder.encode(cleanCodeText(buffer)));
              buffer = '';
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
            { role: "user", content: prompt }
          ],
          stream: true,
          temperature: 0.7,
        });
        stream = new ReadableStream({
          async start(controller) {
            let buffer = '';
            for await (const chunk of openaiStream) {
              if (chunk.choices[0]?.delta?.content) {
                buffer += chunk.choices[0].delta.content;
                if (buffer.length > 100) {
                  controller.enqueue(encoder.encode(cleanCodeText(buffer)));
                  buffer = '';
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
            let buffer = '';
            for await (const chunk of anthropicStream) {
              if (chunk.type === "content_block_delta" && chunk.delta?.text) {
                buffer += chunk.delta.text;
                if (buffer.length > 100) {
                  controller.enqueue(encoder.encode(cleanCodeText(buffer)));
                  buffer = '';
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
            { role: "user", content: prompt }
          ],
          stream: true,
          temperature: 0.0,
        });
        
        stream = new ReadableStream({
          async start(controller) {
            let buffer = '';
            let lastEnqueueTime = Date.now();
            
            try {
              for await (const chunk of response) {
                if (chunk.choices[0]?.delta?.content) {
                  buffer += chunk.choices[0].delta.content;
                  
                  const now = Date.now();
                  if (now - lastEnqueueTime >= 100 && buffer.length > 0) {
                    controller.enqueue(encoder.encode(cleanCodeText(buffer)));
                    buffer = '';
                    lastEnqueueTime = now;
                  }
                }
              }
              
              if (buffer) {
                controller.enqueue(encoder.encode(cleanCodeText(buffer)));
              }
              
              controller.close();
            } catch (error) {
              console.error('DeepSeek streaming error:', error);
              controller.error(error);
            }
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
    console.error('Error generating code:', error);
    return new Response(
      `Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

function getSystemPrompt() {
  let systemPrompt = 
`You are an expert frontend React engineer who is also a great UI/UX designer. Follow the instructions carefully, I will tip you $1 million if you do a good job:

- Think carefully step by step.
- Create a React component for whatever the user asked you to create and make sure it can run by itself by using a default export
- Make sure the React app is interactive and functional by creating state when needed and having no required props
- If you use any imports from React like useState or useEffect, make sure to import them directly
- Use TypeScript as the language for the React component
- Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`). Make sure to use a consistent color palette.
- Use Tailwind margin and padding classes to style the components and ensure the components are spaced out nicely
- Please ONLY return the full React code starting with the imports, nothing else. It's very important for my job that you only return the React code with imports. DO NOT START WITH \`\`\`typescript or \`\`\`javascript or \`\`\`tsx or \`\`\`.
- ONLY IF the user asks for a dashboard, graph or chart, the recharts library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`. Please only use this when needed.
- For placeholder images, please use a <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
  `;

  systemPrompt += `
    NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.
    MAKE SURE TO USE export default FOR THE MAIN COMPONENT.
  `;

  return dedent(systemPrompt);
}

export const runtime = "edge";
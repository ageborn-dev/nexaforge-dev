import { createErrorFixer } from "../../../utils/error-fix-chain";
import { AI_PROVIDERS } from "../../../config/ai-providers";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = z.object({
      model: z.string(),
      code: z.string(),
      error: z.string(),
      errorDetails: z.object({
        line: z.number().optional(),
        column: z.number().optional(),
      }).optional(),
    }).safeParse(json);

    if (!result.success) {
      return new Response(result.error.message, { status: 400 });
    }

    const { model, code, error, errorDetails } = result.data;
    
    // Find the provider for the selected model
    const providerEntry = Object.entries(AI_PROVIDERS).find(([_, models]) => 
      models.some(m => m.id === model)
    );

    if (!providerEntry) {
      return new Response("Invalid model selected", { status: 400 });
    }

    const [provider] = providerEntry;

    // Get the appropriate API key based on provider
    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`] || "";

    // Create and stream the fix
    const fixStream = await createErrorFixer({
      provider,
      model,
      apiKey,
      code,
      error,
      errorDetails,
    });

    // Create a ReadableStream from the AsyncGenerator
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of fixStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
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
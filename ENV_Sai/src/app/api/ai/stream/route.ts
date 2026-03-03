/**
 * GET /api/ai/stream?projectId=xxx&manifestId=xxx&prompt=xxx
 * Server-Sent Events endpoint for streaming AI responses.
 *
 * Emits structured events:
 *   data: {"type":"status","status":"processing"}
 *   data: {"type":"token","content":"..."}   (one per AI token)
 *   data: {"type":"final","patch":{...},"summary":"..."}
 *   data: {"type":"error","message":"..."}
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { getAiService } from "@/lib/services/ai-service";
import { aiOutputSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireUser(request);
  if (errorResponse) return errorResponse;

  // Rate limit
  const rl = await rateLimit(
    `ai-stream:${user!.sub}`,
    env.rateLimitAiMax,
    env.rateLimitAiWindowMs
  );
  if (!rl.allowed) {
    return new Response("Rate limited", { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const manifestId = searchParams.get("manifestId");
  const prompt = searchParams.get("prompt");

  if (!projectId || !manifestId || !prompt) {
    return new Response("Missing required parameters", { status: 400 });
  }

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user!.sub },
  });
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const manifest = await prisma.manifest.findFirst({
    where: { id: manifestId, projectId },
  });
  if (!manifest) {
    return new Response("Manifest not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(data)));

      try {
        const aiService = getAiService();
        const decodedPrompt = decodeURIComponent(prompt);

        enqueue({ type: "status", status: "processing" });

        let accumulated = "";
        const generator = aiService.streamSuggestion({
          manifestJson: JSON.stringify(manifest.jsonData),
          prompt: decodedPrompt,
        });

        for await (const chunk of generator) {
          accumulated += chunk;
          enqueue({ type: "token", content: chunk });
        }

        // Attempt to parse and validate the final accumulated JSON
        try {
          const parsed = JSON.parse(accumulated);
          const validated = aiOutputSchema.safeParse(parsed);
          if (validated.success) {
            enqueue({
              type: "final",
              patch: validated.data.patch,
              summary: validated.data.summary,
            });
          } else {
            // Don't expose internal schema details to the client in production
            enqueue({
              type: "final",
              raw: accumulated,
              validationFailed: true,
            });
          }
        } catch {
          enqueue({ type: "final", raw: accumulated });
        }

        controller.close();
      } catch (error) {
        logger.error("Stream error", { error: String(error) });
        enqueue({ type: "error", message: "Stream failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

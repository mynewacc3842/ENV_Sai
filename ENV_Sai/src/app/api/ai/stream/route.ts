/**
 * GET /api/ai/stream?projectId=xxx&manifestId=xxx&prompt=xxx
 * Server-Sent Events endpoint for streaming AI responses
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { getAiService } from "@/lib/services/ai-service";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      try {
        const aiService = getAiService();
        const generator = aiService.streamSuggestion({
          manifestJson: JSON.stringify(manifest.jsonData),
          prompt: decodeURIComponent(prompt),
        });

        for await (const chunk of generator) {
          const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        logger.error("Stream error", { error: String(error) });
        const errorData = `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
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

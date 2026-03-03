/**
 * POST /api/ai/suggest
 * Request an AI suggestion for a project
 *
 * This endpoint is async - it creates a job and returns a jobId
 * for status polling.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { aiSuggestSchema } from "@/lib/validation/schemas";
import { getAiService, AiServiceError } from "@/lib/services/ai-service";
import {
  apiSuccess,
  validationError,
  notFound,
  rateLimited,
  serverError,
  apiError,
} from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    // Rate limit
    const rl = await rateLimit(
      `ai:${user!.sub}`,
      env.rateLimitAiMax,
      env.rateLimitAiWindowMs
    );
    if (!rl.allowed) {
      return rateLimited("AI request rate limit exceeded. Try again shortly.");
    }

    const body = await request.json();
    const parsed = aiSuggestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid suggestion request", parsed.error.flatten());
    }

    const { projectId, manifestId, prompt, options } = parsed.data;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user!.sub },
    });
    if (!project) {
      return notFound("Project not found");
    }

    // Get manifest
    const manifest = await prisma.manifest.findFirst({
      where: { id: manifestId, projectId },
    });
    if (!manifest) {
      return notFound("Manifest not found");
    }

    // Create AI job record
    const aiJob = await prisma.aiJob.create({
      data: {
        userId: user!.sub,
        projectId,
        manifestId,
        prompt,
        status: "PROCESSING",
      },
    });

    // Run AI generation (synchronous for now — can be queued later)
    try {
      const aiService = getAiService();
      const result = await aiService.generateSuggestion({
        manifestJson: JSON.stringify(manifest.jsonData),
        prompt,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      // Create patch record
      const patch = await prisma.patch.create({
        data: {
          projectId,
          manifestId,
          aiJobId: aiJob.id,
          jsonPatch: result.output.patch as object,
          summary: result.output.summary,
          status: "PENDING",
        },
      });

      // Update AI job
      await prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: "COMPLETED",
          result: {
            patchId: patch.id,
            usage: result.usage,
          } as object,
        },
      });

      logger.info("AI suggestion completed", {
        aiJobId: aiJob.id,
        patchId: patch.id,
      });

      return apiSuccess({
        aiJobId: aiJob.id,
        patchId: patch.id,
        patch: result.output.patch,
        summary: result.output.summary,
        usage: result.usage,
      });
    } catch (aiError) {
      // Update job as failed
      await prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: "FAILED",
          error:
            aiError instanceof AiServiceError
              ? aiError.message
              : "Unknown AI error",
        },
      });

      if (aiError instanceof AiServiceError) {
        return apiError("AI_ERROR", aiError.message, 502, aiError.details);
      }
      throw aiError;
    }
  } catch (error) {
    logger.error("AI suggest error", { error: String(error) });
    return serverError();
  }
}

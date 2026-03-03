/**
 * POST /api/patch/approve
 * Approve a pending patch
 *
 * POST /api/patch/reject
 * Reject a pending patch
 *
 * GET /api/patch?projectId=xxx
 * List patches for a project
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { approvePatchSchema, rejectPatchSchema } from "@/lib/validation/schemas";
import {
  apiSuccess,
  validationError,
  notFound,
  apiError,
  serverError,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

/**
 * GET - List patches for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    if (!projectId) {
      return validationError("projectId query parameter is required");
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user!.sub },
    });
    if (!project) {
      return notFound("Project not found");
    }

    const where: Record<string, unknown> = { projectId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const patches = await prisma.patch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        aiJob: {
          select: { prompt: true },
        },
      },
    });

    return apiSuccess({
      patches: patches.map((p) => ({
        id: p.id,
        projectId: p.projectId,
        manifestId: p.manifestId,
        summary: p.summary,
        status: p.status.toLowerCase(),
        opsCount: (p.jsonPatch as { ops?: unknown[] })?.ops?.length ?? 0,
        prompt: p.aiJob?.prompt,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("List patches error", { error: String(error) });
    return serverError();
  }
}

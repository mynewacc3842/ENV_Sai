/**
 * GET /api/patch/[patchId]
 * Get full patch details including ops
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, notFound, serverError } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { patchId: string } }
) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const patch = await prisma.patch.findFirst({
      where: { id: params.patchId },
      include: {
        project: {
          select: { userId: true, name: true },
        },
        aiJob: {
          select: { prompt: true },
        },
      },
    });

    if (!patch || patch.project.userId !== user!.sub) {
      return notFound("Patch not found");
    }

    return apiSuccess({
      patch: {
        id: patch.id,
        projectId: patch.projectId,
        projectName: patch.project.name,
        manifestId: patch.manifestId,
        ops: patch.jsonPatch,
        summary: patch.summary,
        status: patch.status.toLowerCase(),
        prompt: patch.aiJob?.prompt,
        deliveredAt: patch.deliveredAt?.toISOString() || null,
        createdAt: patch.createdAt.toISOString(),
        updatedAt: patch.updatedAt.toISOString(),
      },
    });
  } catch {
    return serverError();
  }
}

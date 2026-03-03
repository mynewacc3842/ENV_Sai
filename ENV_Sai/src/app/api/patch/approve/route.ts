/**
 * POST /api/patch/approve
 * Approve a pending patch
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { approvePatchSchema } from "@/lib/validation/schemas";
import { apiSuccess, validationError, notFound, apiError, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const parsed = approvePatchSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid data", parsed.error.flatten());
    }

    const { patchId } = parsed.data;

    // Find patch and verify ownership
    const patch = await prisma.patch.findFirst({
      where: { id: patchId },
      include: {
        project: { select: { userId: true } },
      },
    });

    if (!patch || patch.project.userId !== user!.sub) {
      return notFound("Patch not found");
    }

    if (patch.status !== "PENDING") {
      return apiError(
        "INVALID_STATUS",
        `Cannot approve patch with status: ${patch.status.toLowerCase()}`,
        400
      );
    }

    // Approve
    const updated = await prisma.patch.update({
      where: { id: patchId },
      data: { status: "APPROVED" },
    });

    logger.info("Patch approved", { patchId, userId: user!.sub });

    return apiSuccess({
      patch: {
        id: updated.id,
        status: updated.status.toLowerCase(),
      },
    });
  } catch (error) {
    logger.error("Approve patch error", { error: String(error) });
    return serverError();
  }
}

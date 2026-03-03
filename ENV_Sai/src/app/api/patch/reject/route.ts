/**
 * POST /api/patch/reject
 * Reject a pending patch
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { rejectPatchSchema } from "@/lib/validation/schemas";
import { apiSuccess, validationError, notFound, apiError, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const parsed = rejectPatchSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid data", parsed.error.flatten());
    }

    const { patchId } = parsed.data;

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
        `Cannot reject patch with status: ${patch.status.toLowerCase()}`,
        400
      );
    }

    const updated = await prisma.patch.update({
      where: { id: patchId },
      data: { status: "REJECTED" },
    });

    logger.info("Patch rejected", { patchId, userId: user!.sub });

    return apiSuccess({
      patch: {
        id: updated.id,
        status: updated.status.toLowerCase(),
      },
    });
  } catch (error) {
    logger.error("Reject patch error", { error: String(error) });
    return serverError();
  }
}

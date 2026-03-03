/**
 * GET /api/ai/job/[jobId]
 * Poll AI job status
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, notFound, serverError } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const job = await prisma.aiJob.findFirst({
      where: {
        id: params.jobId,
        userId: user!.sub,
      },
      include: {
        patches: {
          select: {
            id: true,
            summary: true,
            status: true,
          },
        },
      },
    });

    if (!job) {
      return notFound("AI job not found");
    }

    return apiSuccess({
      job: {
        id: job.id,
        status: job.status.toLowerCase(),
        prompt: job.prompt,
        result: job.result,
        error: job.error,
        patches: job.patches,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    });
  } catch {
    return serverError();
  }
}

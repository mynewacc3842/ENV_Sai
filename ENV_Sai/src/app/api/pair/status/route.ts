/**
 * GET /api/pair/status
 * Check pairing code status (used by frontend polling)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    // Get the most recent pairing code for this user
    const latestCode = await prisma.pairingCode.findFirst({
      where: { userId: user!.sub },
      orderBy: { createdAt: "desc" },
    });

    if (!latestCode) {
      return apiSuccess({ status: "none" });
    }

    if (latestCode.used) {
      return apiSuccess({ status: "paired" });
    }

    if (latestCode.expiresAt < new Date()) {
      return apiSuccess({ status: "expired" });
    }

    return apiSuccess({
      status: "waiting",
      code: latestCode.code,
      expiresAt: latestCode.expiresAt.toISOString(),
    });
  } catch {
    return serverError();
  }
}

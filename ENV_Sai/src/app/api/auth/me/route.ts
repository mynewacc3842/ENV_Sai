/**
 * GET /api/auth/me
 * Get current authenticated user
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, notFound, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { user: auth, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const user = await prisma.user.findUnique({
      where: { id: auth!.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return notFound("User not found");
    }

    return apiSuccess({ user });
  } catch (error) {
    logger.error("Get user error", { error: String(error) });
    return serverError();
  }
}

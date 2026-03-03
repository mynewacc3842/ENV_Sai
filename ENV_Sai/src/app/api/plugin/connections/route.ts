/**
 * GET /api/plugin/connections
 * List plugin connections for the current user
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const connections = await prisma.pluginConnection.findMany({
      where: { userId: user!.sub },
      select: {
        id: true,
        machineId: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
    });

    return apiSuccess({ connections });
  } catch {
    return serverError();
  }
}

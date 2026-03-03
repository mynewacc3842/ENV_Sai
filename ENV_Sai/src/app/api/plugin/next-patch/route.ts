/**
 * GET /api/plugin/next-patch
 * Plugin polls for the next approved, undelivered patch
 *
 * POST /api/plugin/next-patch
 * Plugin confirms patch delivery
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePlugin } from "@/lib/auth";
import { apiSuccess, notFound, validationError, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

/**
 * GET - Get next approved, undelivered patch for this user's projects
 */
export async function GET(request: NextRequest) {
  try {
    const { plugin, errorResponse } = await requirePlugin(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {
      status: "APPROVED",
      deliveredAt: null,
      project: { userId: plugin!.sub },
    };
    if (projectId) {
      where.projectId = projectId;
    }

    const patch = await prisma.patch.findFirst({
      where,
      orderBy: { createdAt: "asc" },
    });

    if (!patch) {
      return apiSuccess({ patch: null, message: "No pending patches" });
    }

    // Update plugin last seen
    await prisma.pluginConnection.update({
      where: { id: plugin!.connectionId },
      data: { lastSeenAt: new Date() },
    });

    return apiSuccess({
      patch: {
        id: patch.id,
        projectId: patch.projectId,
        ops: patch.jsonPatch,
        summary: patch.summary,
        createdAt: patch.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Plugin next-patch error", { error: String(error) });
    return serverError();
  }
}

/**
 * POST - Plugin confirms it received and applied the patch
 */
export async function POST(request: NextRequest) {
  try {
    const { plugin, errorResponse } = await requirePlugin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const patchId = body?.patchId;

    if (!patchId || typeof patchId !== "string") {
      return validationError("patchId is required");
    }

    const patch = await prisma.patch.findFirst({
      where: {
        id: patchId,
        status: "APPROVED",
        project: { userId: plugin!.sub },
      },
    });

    if (!patch) {
      return notFound("Patch not found or not approved");
    }

    await prisma.patch.update({
      where: { id: patchId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    logger.info("Patch delivered to plugin", {
      patchId,
      userId: plugin!.sub,
    });

    return apiSuccess({ delivered: true, patchId });
  } catch (error) {
    logger.error("Plugin patch confirm error", { error: String(error) });
    return serverError();
  }
}

/**
 * GET /api/workspace/projects
 * List user's projects
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const projects = await prisma.project.findMany({
      where: { userId: user!.sub },
      include: {
        manifests: {
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, version: true, createdAt: true },
        },
        _count: {
          select: {
            patches: true,
            manifests: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Serialize BigInt placeId to string
    const serialized = projects.map((p) => ({
      id: p.id,
      placeId: p.placeId.toString(),
      name: p.name,
      latestManifest: p.manifests[0] || null,
      patchCount: p._count.patches,
      manifestCount: p._count.manifests,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return apiSuccess({ projects: serialized });
  } catch (error) {
    logger.error("List projects error", { error: String(error) });
    return serverError();
  }
}

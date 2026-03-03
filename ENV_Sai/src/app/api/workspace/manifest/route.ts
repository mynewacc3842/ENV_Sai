/**
 * POST /api/workspace/manifest
 * Upload a workspace manifest from the plugin
 *
 * GET /api/workspace/manifest?projectId=xxx
 * Get the latest manifest for a project (user)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePlugin, requireUser } from "@/lib/auth";
import { uploadManifestSchema } from "@/lib/validation/schemas";
import { apiSuccess, validationError, notFound, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

/**
 * POST - Plugin uploads a manifest
 */
export async function POST(request: NextRequest) {
  try {
    const { plugin, errorResponse } = await requirePlugin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const parsed = uploadManifestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid manifest data", parsed.error.flatten());
    }

    const { placeId, projectName, manifest } = parsed.data;

    // Upsert project
    const project = await prisma.project.upsert({
      where: {
        userId_placeId: {
          userId: plugin!.sub,
          placeId: BigInt(placeId),
        },
      },
      update: {
        name: projectName || `Place ${placeId}`,
        updatedAt: new Date(),
      },
      create: {
        userId: plugin!.sub,
        placeId: BigInt(placeId),
        name: projectName || `Place ${placeId}`,
      },
    });

    // Get latest manifest version
    const lastManifest = await prisma.manifest.findFirst({
      where: { projectId: project.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    // Store manifest
    const newManifest = await prisma.manifest.create({
      data: {
        projectId: project.id,
        jsonData: manifest as object,
        version: (lastManifest?.version ?? 0) + 1,
      },
    });

    // Update plugin connection lastSeen
    await prisma.pluginConnection.update({
      where: { id: plugin!.connectionId },
      data: { lastSeenAt: new Date() },
    });

    logger.info("Manifest uploaded", {
      projectId: project.id,
      manifestId: newManifest.id,
      version: newManifest.version,
    });

    return apiSuccess(
      {
        projectId: project.id,
        manifestId: newManifest.id,
        version: newManifest.version,
      },
      201
    );
  } catch (error) {
    logger.error("Manifest upload error", { error: String(error) });
    return serverError();
  }
}

/**
 * GET - User retrieves latest manifest for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return validationError("projectId query parameter is required");
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user!.sub },
    });

    if (!project) {
      return notFound("Project not found");
    }

    // Get latest manifest
    const manifest = await prisma.manifest.findFirst({
      where: { projectId: project.id },
      orderBy: { version: "desc" },
    });

    if (!manifest) {
      return notFound("No manifests found for this project");
    }

    return apiSuccess({
      manifest: {
        id: manifest.id,
        projectId: manifest.projectId,
        version: manifest.version,
        data: manifest.jsonData,
        createdAt: manifest.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Manifest get error", { error: String(error) });
    return serverError();
  }
}

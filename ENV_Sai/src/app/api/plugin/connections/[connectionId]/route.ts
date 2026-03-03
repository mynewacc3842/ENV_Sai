/**
 * DELETE /api/plugin/connections/[connectionId]
 * Revoke (disconnect) a plugin connection for the current user.
 * Invalidates the stored refresh token so the plugin can no longer refresh.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { notFound, apiSuccess, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    const { connectionId } = params;

    // Verify the connection belongs to the current user
    const connection = await prisma.pluginConnection.findFirst({
      where: { id: connectionId, userId: user!.sub },
    });

    if (!connection) {
      return notFound("Plugin connection not found");
    }

    // Revoke by marking inactive and invalidating the refresh token hash.
    // Use a connection-specific sentinel value to satisfy the @unique constraint.
    await prisma.pluginConnection.update({
      where: { id: connectionId },
      data: {
        isActive: false,
        refreshToken: `revoked:${connectionId}`,
      },
    });

    logger.info("Plugin connection revoked", {
      connectionId,
      userId: user!.sub,
    });

    return apiSuccess({ revoked: true, connectionId });
  } catch (error) {
    logger.error("Plugin disconnect error", { error: String(error) });
    return serverError();
  }
}

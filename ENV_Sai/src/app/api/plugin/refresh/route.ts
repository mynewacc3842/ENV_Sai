/**
 * POST /api/plugin/refresh
 * Exchange a plugin refresh token for a new access token + rotated refresh token.
 * Uses refresh-token rotation — each refresh token can only be used once.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  generatePluginToken,
  generatePluginRefreshToken,
  hashToken,
} from "@/lib/auth";
import { apiSuccess, unauthorized, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

// Inline verification for plugin-refresh tokens (separate from plugin access tokens)
import { jwtVerify } from "jose";

async function verifyPluginRefreshToken(
  token: string
): Promise<{ sub: string; connectionId: string } | null> {
  try {
    const secretValue = process.env.JWT_REFRESH_SECRET;
    if (!secretValue) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }
    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "roblox-ai-agent",
    });
    const p = payload as { sub?: string; connectionId?: string; type?: string };
    if (p.type !== "plugin-refresh" || !p.sub || !p.connectionId) return null;
    return { sub: p.sub, connectionId: p.connectionId };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawRefreshToken: unknown = body?.pluginRefreshToken;

    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return unauthorized("pluginRefreshToken is required");
    }

    // Verify JWT signature
    const payload = await verifyPluginRefreshToken(rawRefreshToken);
    if (!payload) {
      return unauthorized("Invalid plugin refresh token");
    }

    // Look up connection by id + hashed token (rotation check)
    const connection = await prisma.pluginConnection.findFirst({
      where: {
        id: payload.connectionId,
        userId: payload.sub,
        refreshToken: hashToken(rawRefreshToken),
        isActive: true,
      },
    });

    if (!connection) {
      return unauthorized("Plugin refresh token has been revoked or already used");
    }

    // Issue new tokens with rotation
    const newPluginJWT = await generatePluginToken(
      connection.userId,
      connection.id,
      connection.machineId
    );
    const newRefreshToken = await generatePluginRefreshToken(
      connection.userId,
      connection.id
    );

    // Rotate: overwrite stored hash
    await prisma.pluginConnection.update({
      where: { id: connection.id },
      data: {
        refreshToken: hashToken(newRefreshToken),
        lastSeenAt: new Date(),
      },
    });

    logger.info("Plugin token refreshed", {
      connectionId: connection.id,
      userId: connection.userId,
    });

    return apiSuccess({
      pluginToken: newPluginJWT,
      pluginRefreshToken: newRefreshToken,
      connectionId: connection.id,
    });
  } catch (error) {
    logger.error("Plugin refresh error", { error: String(error) });
    return serverError();
  }
}

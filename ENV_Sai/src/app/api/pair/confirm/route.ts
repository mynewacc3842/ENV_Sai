/**
 * POST /api/pair/confirm
 * Plugin confirms pairing with a code + machineId
 * Returns plugin JWT tokens
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generatePluginToken, generatePluginRefreshToken, hashToken } from "@/lib/auth";
import { confirmPairingSchema } from "@/lib/validation/schemas";
import { apiSuccess, validationError, apiError, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = confirmPairingSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid pairing data", parsed.error.flatten());
    }

    const { pairingCode, pluginMachineId } = parsed.data;

    // Find valid pairing code
    const code = await prisma.pairingCode.findFirst({
      where: {
        code: pairingCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!code) {
      return apiError("INVALID_CODE", "Pairing code is invalid or expired", 400);
    }

    // Mark code as used
    await prisma.pairingCode.update({
      where: { id: code.id },
      data: { used: true },
    });

    // Create or update plugin connection
    const connection = await prisma.pluginConnection.upsert({
      where: {
        userId_machineId: {
          userId: code.userId,
          machineId: pluginMachineId,
        },
      },
      update: {
        refreshToken: "pending",
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId: code.userId,
        machineId: pluginMachineId,
        refreshToken: "pending",
      },
    });

    // Generate plugin tokens
    const pluginJWT = await generatePluginToken(
      code.userId,
      connection.id,
      pluginMachineId
    );
    const pluginRefreshToken = await generatePluginRefreshToken(
      code.userId,
      connection.id
    );

    // Store hashed refresh token
    await prisma.pluginConnection.update({
      where: { id: connection.id },
      data: { refreshToken: hashToken(pluginRefreshToken) },
    });

    logger.info("Plugin paired successfully", {
      userId: code.userId,
      connectionId: connection.id,
      machineId: pluginMachineId,
    });

    return apiSuccess({
      pluginToken: pluginJWT,
      pluginRefreshToken,
      userId: code.userId,
      connectionId: connection.id,
    });
  } catch (error) {
    logger.error("Pairing confirm error", { error: String(error) });
    return serverError();
  }
}

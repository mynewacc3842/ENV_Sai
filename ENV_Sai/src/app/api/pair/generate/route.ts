/**
 * POST /api/pair/generate
 * Generate a pairing code for the logged-in user
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth";
import { apiSuccess, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request);
    if (errorResponse) return errorResponse;

    // Invalidate any existing unused codes for this user
    await prisma.pairingCode.updateMany({
      where: {
        userId: user!.sub,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const pairingCode = await prisma.pairingCode.create({
      data: {
        code,
        userId: user!.sub,
        expiresAt,
      },
    });

    logger.info("Pairing code generated", {
      userId: user!.sub,
      codeId: pairingCode.id,
    });

    return apiSuccess({
      code: pairingCode.code,
      expiresAt: pairingCode.expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error("Generate pairing code error", { error: String(error) });
    return serverError();
  }
}

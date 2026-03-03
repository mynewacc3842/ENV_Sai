/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from cookie
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "@/lib/auth";
import { apiSuccess, unauthorized, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshTokenCookie = request.cookies.get("refresh_token")?.value;
    if (!refreshTokenCookie) {
      return unauthorized("No refresh token provided");
    }

    // Verify token signature
    const payload = await verifyRefreshToken(refreshTokenCookie);
    if (!payload || !payload.sub || !payload.sessionId) {
      return unauthorized("Invalid refresh token");
    }

    // Find session by id + hashed token
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        refreshToken: hashToken(refreshTokenCookie),
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      return unauthorized("Session expired or revoked");
    }

    // Rotate refresh token — store new hash
    const newRefreshToken = await generateRefreshToken(session.userId, session.id);
    const newAccessToken = await generateAccessToken(session.userId, session.user.email);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info("Token refreshed", { userId: session.userId });

    const response = apiSuccess({
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
      },
    });

    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    logger.error("Token refresh error", { error: String(error) });
    return serverError();
  }
}

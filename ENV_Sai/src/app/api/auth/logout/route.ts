/**
 * POST /api/auth/logout
 * Invalidate session and clear tokens
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyRefreshToken } from "@/lib/auth";
import { apiSuccess, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const refreshTokenCookie = request.cookies.get("refresh_token")?.value;

    if (refreshTokenCookie) {
      const payload = await verifyRefreshToken(refreshTokenCookie);
      if (payload?.sessionId) {
        await prisma.session.deleteMany({
          where: { id: payload.sessionId },
        });
        logger.info("User logged out", { userId: payload.sub });
      }
    }

    const response = apiSuccess({ message: "Logged out successfully" });

    // Clear cookies
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    });

    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    logger.error("Logout error", { error: String(error) });
    return serverError();
  }
}

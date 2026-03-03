/**
 * POST /api/auth/login
 * Authenticate a user with email/password
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, generateAccessToken, generateRefreshToken, hashToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/schemas";
import { apiSuccess, validationError, apiError, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid login data", parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: "pending",
        userAgent: request.headers.get("user-agent") || undefined,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, user.email);
    const refreshToken = await generateRefreshToken(user.id, session.id);

    // Store hashed refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: hashToken(refreshToken) },
    });

    logger.info("User logged in", { userId: user.id });

    // Return user info only — access token is delivered via httpOnly cookie only
    const response = apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });

    // Set httpOnly cookies
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    logger.error("Login error", { error: String(error) });
    return serverError();
  }
}

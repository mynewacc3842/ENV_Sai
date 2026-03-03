/**
 * POST /api/auth/register
 * Register a new user account
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, generateAccessToken, generateRefreshToken, hashToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validation/schemas";
import { apiSuccess, validationError, apiError, serverError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Invalid registration data", parsed.error.flatten());
    }

    const { email, password, displayName } = parsed.data;

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("EMAIL_EXISTS", "An account with this email already exists", 409);
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || email.split("@")[0],
      },
    });

    // Create session placeholder
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: "pending",
        userAgent: request.headers.get("user-agent") || undefined,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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

    logger.info("User registered", { userId: user.id, email: user.email });

    // Return user info only — access token is delivered via httpOnly cookie only
    const response = apiSuccess(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      },
      201
    );

    // Set HTTP-only cookie for refresh token
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Set access token cookie
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch (error) {
    logger.error("Registration error", { error: String(error) });
    return serverError();
  }
}

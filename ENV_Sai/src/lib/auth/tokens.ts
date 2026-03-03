/**
 * JWT token utilities using jose (edge-compatible)
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/config/env";

// ─── Token Payloads ───

export interface UserTokenPayload extends JWTPayload {
  sub: string; // userId
  email: string;
  type: "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}

export interface PluginTokenPayload extends JWTPayload {
  sub: string; // userId
  connectionId: string;
  machineId: string;
  type: "plugin";
}

// ─── Secrets ───

function getAccessSecret() {
  return new TextEncoder().encode(env.jwtSecret);
}

function getRefreshSecret() {
  return new TextEncoder().encode(env.jwtRefreshSecret);
}

// ─── Token Generation ───

export async function generateAccessToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({ email, type: "access" } as UserTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("roblox-ai-agent")
    .sign(getAccessSecret());
}

export async function generateRefreshToken(
  userId: string,
  sessionId: string
): Promise<string> {
  return new SignJWT({ sessionId, type: "refresh" } as RefreshTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("roblox-ai-agent")
    .sign(getRefreshSecret());
}

export async function generatePluginToken(
  userId: string,
  connectionId: string,
  machineId: string
): Promise<string> {
  return new SignJWT({
    connectionId,
    machineId,
    type: "plugin",
  } as PluginTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .setIssuer("roblox-ai-agent")
    .sign(getAccessSecret());
}

export async function generatePluginRefreshToken(
  userId: string,
  connectionId: string
): Promise<string> {
  return new SignJWT({
    connectionId,
    type: "plugin-refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .setIssuer("roblox-ai-agent")
    .sign(getRefreshSecret());
}

// ─── Token Verification ───

export async function verifyAccessToken(
  token: string
): Promise<UserTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), {
      issuer: "roblox-ai-agent",
    });
    if ((payload as UserTokenPayload).type !== "access") return null;
    return payload as UserTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret(), {
      issuer: "roblox-ai-agent",
    });
    if ((payload as RefreshTokenPayload).type !== "refresh") return null;
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyPluginToken(
  token: string
): Promise<PluginTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), {
      issuer: "roblox-ai-agent",
    });
    if ((payload as PluginTokenPayload).type !== "plugin") return null;
    return payload as PluginTokenPayload;
  } catch {
    return null;
  }
}

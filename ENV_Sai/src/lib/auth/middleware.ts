/**
 * Route-level authentication middleware helpers
 */

import { NextRequest } from "next/server";
import {
  verifyAccessToken,
  verifyPluginToken,
  type UserTokenPayload,
  type PluginTokenPayload,
} from "./tokens";
import { unauthorized } from "@/lib/api/response";

/**
 * Extract and verify user JWT from request.
 * Checks Authorization header and cookies.
 */
export async function authenticateUser(
  request: NextRequest
): Promise<UserTokenPayload | null> {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyAccessToken(token);
  }

  // Try cookie
  const cookieToken = request.cookies.get("access_token")?.value;
  if (cookieToken) {
    return verifyAccessToken(cookieToken);
  }

  return null;
}

/**
 * Extract and verify plugin JWT from request.
 * Plugin endpoints use Authorization header only.
 */
export async function authenticatePlugin(
  request: NextRequest
): Promise<PluginTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyPluginToken(token);
}

/**
 * Higher-order wrapper requiring user auth.
 * Returns the auth payload or an error response.
 */
export async function requireUser(request: NextRequest) {
  const user = await authenticateUser(request);
  if (!user) {
    return { user: null, errorResponse: unauthorized() };
  }
  return { user, errorResponse: null };
}

/**
 * Higher-order wrapper requiring plugin auth.
 */
export async function requirePlugin(request: NextRequest) {
  const plugin = await authenticatePlugin(request);
  if (!plugin) {
    return { plugin: null, errorResponse: unauthorized("Valid plugin token required") };
  }
  return { plugin, errorResponse: null };
}

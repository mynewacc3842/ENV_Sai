/**
 * Centralized API response format
 * All API endpoints return this structure for consistency.
 */

import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Response Helpers ───

export function apiSuccess<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}

// ─── Common Error Responses ───

export function unauthorized(message = "Authentication required") {
  return apiError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Access denied") {
  return apiError("FORBIDDEN", message, 403);
}

export function notFound(message = "Resource not found") {
  return apiError("NOT_FOUND", message, 404);
}

export function validationError(message: string, details?: unknown) {
  return apiError("VALIDATION_ERROR", message, 422, details);
}

export function rateLimited(message = "Too many requests") {
  return apiError("RATE_LIMITED", message, 429);
}

export function serverError(message = "Internal server error") {
  return apiError("SERVER_ERROR", message, 500);
}

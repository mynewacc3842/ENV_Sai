/**
 * Client-side API utilities with automatic token refresh via httpOnly cookies.
 * Access tokens are managed server-side in httpOnly cookies only — never stored
 * in JS state — to prevent XSS token theft.
 */

import type { ApiResponse } from "@/lib/api/response";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  async fetch<T>(
    path: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const makeRequest = async (): Promise<Response> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    };

    let response = await makeRequest();

    // If 401, try refreshing the access-token cookie
    if (response.status === 401) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken().finally(() => {
          this.refreshPromise = null;
        });
      }

      const refreshed = await this.refreshPromise;
      if (refreshed) {
        response = await makeRequest();
      }
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  // Convenience methods
  get<T>(path: string) {
    return this.fetch<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, { method: "POST", body });
  }

  put<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, { method: "PUT", body });
  }

  delete<T>(path: string) {
    return this.fetch<T>(path, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();

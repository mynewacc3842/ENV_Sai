/**
 * Client-side API utilities with token refresh
 */

import type { ApiResponse } from "@/lib/api/response";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) return false;

      const data = (await res.json()) as ApiResponse<{ accessToken: string }>;
      if (data.success) {
        this.accessToken = data.data.accessToken;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async fetch<T>(
    path: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const makeRequest = async (token: string | null): Promise<Response> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    };

    let response = await makeRequest(this.accessToken);

    // If 401, try refreshing the token
    if (response.status === 401) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken().finally(() => {
          this.refreshPromise = null;
        });
      }

      const refreshed = await this.refreshPromise;
      if (refreshed) {
        response = await makeRequest(this.accessToken);
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

/**
 * Zustand store for authentication state
 */

import { create } from "zustand";
import { apiClient } from "@/lib/api/client";

interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (email, password) => {
    const res = await apiClient.post<{
      user: User;
      accessToken: string;
    }>("/api/auth/login", { email, password });

    if (res.success) {
      apiClient.setAccessToken(res.data.accessToken);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      return true;
    }
    return false;
  },

  register: async (email, password, displayName) => {
    const res = await apiClient.post<{
      user: User;
      accessToken: string;
    }>("/api/auth/register", { email, password, displayName });

    if (res.success) {
      apiClient.setAccessToken(res.data.accessToken);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      return true;
    }
    return false;
  },

  logout: async () => {
    await apiClient.post("/api/auth/logout");
    apiClient.setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const res = await apiClient.get<{ user: User }>("/api/auth/me");
    if (res.success) {
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

/**
 * Zustand store for project and workspace state
 */

import { create } from "zustand";
import { apiClient } from "@/lib/api/client";

interface ProjectSummary {
  id: string;
  placeId: string;
  name: string;
  latestManifest: { id: string; version: number; createdAt: string } | null;
  patchCount: number;
  manifestCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ManifestData {
  id: string;
  projectId: string;
  version: number;
  data: unknown;
  createdAt: string;
}

interface ProjectState {
  projects: ProjectSummary[];
  currentProject: ProjectSummary | null;
  currentManifest: ManifestData | null;
  isLoading: boolean;

  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: ProjectSummary | null) => void;
  fetchManifest: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  currentManifest: null,
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    const res = await apiClient.get<{ projects: ProjectSummary[] }>(
      "/api/workspace/projects"
    );
    if (res.success) {
      set({ projects: res.data.projects, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  fetchManifest: async (projectId) => {
    set({ isLoading: true });
    const res = await apiClient.get<{ manifest: ManifestData }>(
      `/api/workspace/manifest?projectId=${projectId}`
    );
    if (res.success) {
      set({ currentManifest: res.data.manifest, isLoading: false });
    } else {
      set({ currentManifest: null, isLoading: false });
    }
  },
}));

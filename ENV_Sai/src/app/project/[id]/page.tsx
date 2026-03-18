"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkspaceTree, ManifestNode } from "@/components/workspace/workspace-tree";
import { PatchList } from "@/components/patches/patch-list";
import { PatchDiffViewer } from "@/components/patches/patch-diff-viewer";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FolderTree,
  Bot,
  Layers,
  Loader2,
} from "lucide-react";

interface ProjectDetail {
  id: string;
  placeId: string;
  name: string;
}

interface ManifestDetail {
  id: string;
  version: number;
  data: { root: ManifestNode };
}

interface PatchSummary {
  id: string;
  summary: string;
  status: string;
  opsCount: number;
  prompt?: string;
  createdAt: string;
}

interface PatchDetail {
  id: string;
  ops: { ops: Array<{ op: "create" | "update" | "delete"; path: string; className?: string; properties?: Record<string, unknown>; source?: string }> };
  summary: string;
  status: string;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [manifest, setManifest] = useState<ManifestDetail | null>(null);
  const [patches, setPatches] = useState<PatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatch, setSelectedPatch] = useState<PatchDetail | null>(null);
  const [patchModalOpen, setPatchModalOpen] = useState(false);

  // Fetch project data
  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch projects to get this project's name
      const projectsRes = await apiClient.get<{
        projects: Array<{ id: string; placeId: string; name: string }>;
      }>("/api/workspace/projects");

      if (projectsRes.success) {
        const p = projectsRes.data.projects.find((x) => x.id === projectId);
        if (p) setProject(p);
      }

      // Fetch manifest
      const manifestRes = await apiClient.get<{ manifest: ManifestDetail }>(
        `/api/workspace/manifest?projectId=${projectId}`
      );
      if (manifestRes.success) {
        setManifest(manifestRes.data.manifest);
      }

      // Fetch patches
      await refreshPatches();

      setLoading(false);
    }
    load();
  }, [projectId]);

  const refreshPatches = useCallback(async () => {
    const res = await apiClient.get<{ patches: PatchSummary[] }>(
      `/api/patch?projectId=${projectId}`
    );
    if (res.success) {
      setPatches(res.data.patches);
    }
  }, [projectId]);

  const handleViewPatch = useCallback(async (patchId: string) => {
    const res = await apiClient.get<{ patch: PatchDetail }>(
      `/api/patch/${patchId}`
    );
    if (res.success) {
      setSelectedPatch(res.data.patch);
      setPatchModalOpen(true);
    }
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project?.name || "Project"}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Place {project?.placeId}</Badge>
              {manifest && (
                <Badge variant="secondary">Manifest v{manifest.version}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="workspace" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workspace" className="gap-2">
              <FolderTree className="h-4 w-4" />
              Workspace
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="patches" className="gap-2">
              <Layers className="h-4 w-4" />
              Patches ({patches.length})
            </TabsTrigger>
          </TabsList>

          {/* Workspace Tree Tab */}
          <TabsContent value="workspace" className="mt-0">
            <div className="rounded-lg border h-[600px]">
              <WorkspaceTree
                manifest={manifest?.data?.root ?? null}
              />
            </div>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-0">
            <div className="rounded-lg border h-[600px]">
              {manifest ? (
                <AiChatPanel
                  projectId={projectId}
                  manifestId={manifest.id}
                  onPatchCreated={() => refreshPatches()}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Upload a workspace manifest to use the AI assistant.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Patches Tab */}
          <TabsContent value="patches" className="mt-0">
            <div className="rounded-lg border h-[600px]">
              <PatchList
                patches={patches}
                onViewPatch={handleViewPatch}
                onRefresh={refreshPatches}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Patch Detail Modal */}
      <Dialog open={patchModalOpen} onOpenChange={setPatchModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Patch Details
              {selectedPatch && (
                <Badge
                  variant={
                    selectedPatch.status === "approved"
                      ? "success"
                      : selectedPatch.status === "rejected"
                      ? "destructive"
                      : "warning"
                  }
                  className="ml-2"
                >
                  {selectedPatch.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedPatch && (
              <>
                <p className="text-sm text-muted-foreground px-1 mb-2">
                  {selectedPatch.summary}
                </p>
                <PatchDiffViewer
                  ops={
                    (selectedPatch.ops as unknown as { ops: Array<{ op: "create" | "update" | "delete"; path: string; className?: string; properties?: Record<string, unknown>; source?: string }> })
                      ?.ops || []
                  }
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

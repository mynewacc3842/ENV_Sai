"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";
import { AppLayout } from "@/components/layout/app-layout";
import { PairingDialog } from "@/components/pairing/pairing-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, FolderOpen, Bot, Clock, Layers } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { projects, isLoading, fetchProjects } = useProjectStore();
  const [pairingOpen, setPairingOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.displayName || user?.email}
            </p>
          </div>
          <Button onClick={() => setPairingOpen(true)} className="gap-2">
            <Plug className="h-4 w-4" />
            Connect Roblox Studio
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patches
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + p.patchCount, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                AI Sessions
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + p.manifestCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Projects</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No projects yet</h3>
                <CardDescription className="max-w-sm mt-1">
                  Connect your Roblox Studio via the plugin to automatically create
                  a project when you upload your workspace manifest.
                </CardDescription>
                <Button
                  onClick={() => setPairingOpen(true)}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Plug className="h-4 w-4" />
                  Connect Plugin
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {project.name}
                        </CardTitle>
                        <Badge variant="outline">
                          Place {project.placeId}
                        </Badge>
                      </div>
                      <CardDescription>
                        {project.patchCount} patches &middot;{" "}
                        {project.manifestCount} manifests
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Updated{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <PairingDialog
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        onPaired={() => fetchProjects()}
      />
    </AppLayout>
  );
}

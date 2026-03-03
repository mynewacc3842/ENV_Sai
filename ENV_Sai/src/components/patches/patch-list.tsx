"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Eye, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatchSummary {
  id: string;
  summary: string;
  status: string;
  opsCount: number;
  prompt?: string;
  createdAt: string;
}

interface PatchListProps {
  patches: PatchSummary[];
  onViewPatch?: (patchId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const STATUS_BADGES: Record<string, { variant: "default" | "success" | "destructive" | "warning" | "secondary"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  delivered: { variant: "secondary", label: "Delivered" },
};

export function PatchList({ patches, onViewPatch, onRefresh, className }: PatchListProps) {
  const handleApprove = useCallback(async (patchId: string) => {
    await apiClient.post("/api/patch/approve", { patchId });
    onRefresh?.();
  }, [onRefresh]);

  const handleReject = useCallback(async (patchId: string) => {
    await apiClient.post("/api/patch/reject", { patchId });
    onRefresh?.();
  }, [onRefresh]);

  if (patches.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <p>No patches yet. Use the AI to generate suggestions.</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-3 p-4">
        {patches.map((patch) => {
          const badgeInfo = STATUS_BADGES[patch.status] || STATUS_BADGES.pending;
          return (
            <Card key={patch.id} className="overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {patch.summary}
                  </CardTitle>
                  <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{patch.opsCount} operation{patch.opsCount !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(patch.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewPatch?.(patch.id)}
                    className="gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>

                  {patch.status === "pending" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(patch.id)}
                        className="gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(patch.id)}
                        className="gap-1"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </Button>
                    </>
                  )}

                  {patch.status === "approved" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      Waiting for plugin delivery
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

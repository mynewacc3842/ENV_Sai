"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PatchOperation {
  op: "create" | "update" | "delete";
  path: string;
  className?: string;
  properties?: Record<string, unknown>;
  source?: string;
}

interface PatchDiffViewerProps {
  ops: PatchOperation[];
  className?: string;
}

const OP_COLORS: Record<string, string> = {
  create: "text-green-600 dark:text-green-400 bg-green-500/10",
  update: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
  delete: "text-red-600 dark:text-red-400 bg-red-500/10",
};

const OP_BADGES: Record<string, "success" | "warning" | "destructive"> = {
  create: "success",
  update: "warning",
  delete: "destructive",
};

export function PatchDiffViewer({ ops, className }: PatchDiffViewerProps) {
  if (!ops || ops.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No operations in this patch.
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-3 p-4">
        {ops.map((op, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg border p-4",
              OP_COLORS[op.op]
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={OP_BADGES[op.op]}>
                {op.op.toUpperCase()}
              </Badge>
              <code className="text-sm font-mono">{op.path}</code>
              {op.className && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {op.className}
                </span>
              )}
            </div>

            {op.properties && Object.keys(op.properties).length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Properties:
                </p>
                <pre className="rounded bg-background/50 p-2 text-xs overflow-x-auto">
                  {JSON.stringify(op.properties, null, 2)}
                </pre>
              </div>
            )}

            {op.source && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Source (Luau):
                </p>
                <pre className="rounded bg-background/50 p-2 text-xs overflow-x-auto font-mono leading-relaxed">
                  {op.source}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

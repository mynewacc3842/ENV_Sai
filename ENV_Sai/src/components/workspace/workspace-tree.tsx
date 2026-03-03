"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, Code, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ManifestNode {
  name: string;
  className: string;
  properties?: Record<string, unknown>;
  children?: ManifestNode[];
}

interface TreeNodeProps {
  node: ManifestNode;
  depth: number;
  onSelect?: (node: ManifestNode) => void;
}

const CLASS_ICONS: Record<string, typeof File> = {
  Script: Code,
  LocalScript: Code,
  ModuleScript: Code,
  Folder: Folder,
  Part: Box,
  Model: Box,
};

function TreeNode({ node, depth, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = CLASS_ICONS[node.className] || File;

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-sm hover:bg-accent transition-colors text-left",
          "focus:outline-none focus:ring-1 focus:ring-ring"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {node.className}
        </span>
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNode
              key={`${child.name}-${i}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkspaceTreeProps {
  manifest: ManifestNode | null;
  onNodeSelect?: (node: ManifestNode) => void;
  className?: string;
}

export function WorkspaceTree({ manifest, onNodeSelect, className }: WorkspaceTreeProps) {
  if (!manifest) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <p>No workspace manifest loaded. Connect your Roblox Studio plugin to view the workspace tree.</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-2">
        <TreeNode node={manifest} depth={0} onSelect={onNodeSelect} />
      </div>
    </ScrollArea>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, Copy, RefreshCw, Check } from "lucide-react";

interface PairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaired?: () => void;
}

export function PairingDialog({ open, onOpenChange, onPaired }: PairingDialogProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "waiting" | "paired" | "expired">("idle");
  const [copied, setCopied] = useState(false);

  const generateCode = useCallback(async () => {
    setStatus("generating");
    const res = await apiClient.post<{ code: string; expiresAt: string }>(
      "/api/pair/generate"
    );
    if (res.success) {
      setCode(res.data.code);
      setExpiresAt(res.data.expiresAt);
      setStatus("waiting");
    } else {
      setStatus("idle");
    }
  }, []);

  // Poll for pairing status
  useEffect(() => {
    if (status !== "waiting") return;

    const interval = setInterval(async () => {
      const res = await apiClient.get<{ status: string }>("/api/pair/status");
      if (res.success) {
        if (res.data.status === "paired") {
          setStatus("paired");
          onPaired?.();
          clearInterval(interval);
        } else if (res.data.status === "expired") {
          setStatus("expired");
          clearInterval(interval);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, onPaired]);

  // Check expiration
  useEffect(() => {
    if (!expiresAt || status !== "waiting") return;

    const timeout = setTimeout(() => {
      setStatus("expired");
    }, new Date(expiresAt).getTime() - Date.now());

    return () => clearTimeout(timeout);
  }, [expiresAt, status]);

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connect Roblox Studio
          </DialogTitle>
          <DialogDescription>
            Generate a pairing code and enter it in the Roblox Studio plugin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === "idle" && (
            <Button onClick={generateCode} size="lg">
              Generate Pairing Code
            </Button>
          )}

          {status === "generating" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating code...
            </div>
          )}

          {(status === "waiting" || status === "expired") && code && (
            <>
              <div className="flex items-center gap-2">
                <code className="rounded-lg bg-muted px-6 py-3 text-3xl font-mono font-bold tracking-widest">
                  {code}
                </code>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {status === "waiting" && (
                <>
                  <Badge variant="warning">
                    Expires in 5 minutes
                  </Badge>
                  <p className="text-sm text-muted-foreground text-center">
                    Enter this code in the Roblox Studio plugin to connect.
                    <br />
                    Waiting for connection...
                  </p>
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                </>
              )}

              {status === "expired" && (
                <>
                  <Badge variant="destructive">Expired</Badge>
                  <Button variant="outline" onClick={generateCode}>
                    Generate New Code
                  </Button>
                </>
              )}
            </>
          )}

          {status === "paired" && (
            <div className="flex flex-col items-center gap-2">
              <Badge variant="success">Connected!</Badge>
              <p className="text-sm text-muted-foreground">
                Roblox Studio is now connected.
              </p>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Bot, User, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  patchId?: string;
  timestamp: Date;
}

interface AiChatPanelProps {
  projectId: string;
  manifestId: string;
  onPatchCreated?: (patchId: string) => void;
  className?: string;
}

export function AiChatPanel({
  projectId,
  manifestId,
  onPatchCreated,
  className,
}: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await apiClient.post<{
        aiJobId: string;
        patchId: string;
        patch: { ops: unknown[] };
        summary: string;
        usage: { totalTokens: number };
      }>("/api/ai/suggest", {
        projectId,
        manifestId,
        prompt,
      });

      if (res.success) {
        const assistantMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.data.summary,
          patchId: res.data.patchId,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        onPatchCreated?.(res.data.patchId);
      } else {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "error",
          content: res.error.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "error",
        content: "Failed to get AI response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, projectId, manifestId, onPatchCreated]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
            <Bot className="h-12 w-12 opacity-30" />
            <p className="text-sm">
              Describe what you want to build or modify in your Roblox place.
            </p>
            <p className="text-xs">
              The AI will generate structured patch operations.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role !== "user" && (
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    msg.role === "assistant"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.role === "assistant"
                    ? "bg-muted"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.patchId && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Patch created: {msg.patchId.slice(0, 8)}...
                  </Badge>
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating patch...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to build..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
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
import { Plug, Plus, Clock, Monitor } from "lucide-react";

interface Connection {
  id: string;
  machineId: string;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairingOpen, setPairingOpen] = useState(false);

  const fetchConnections = async () => {
    setLoading(true);
    const res = await apiClient.get<{ connections: Connection[] }>(
      "/api/plugin/connections"
    );
    if (res.success) {
      setConnections(res.data.connections);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Plugin Connections</h1>
            <p className="text-muted-foreground">
              Manage your connected Roblox Studio instances
            </p>
          </div>
          <Button onClick={() => setPairingOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Connection
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Plug className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No connections</h3>
              <CardDescription className="max-w-sm mt-1">
                Connect your Roblox Studio instance by generating a pairing
                code.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn) => {
              const lastSeen = new Date(conn.lastSeenAt);
              const isRecent =
                Date.now() - lastSeen.getTime() < 5 * 60 * 1000;

              return (
                <Card key={conn.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        {conn.machineId.slice(0, 16)}...
                      </CardTitle>
                      <Badge
                        variant={
                          conn.isActive && isRecent ? "success" : "secondary"
                        }
                      >
                        {conn.isActive && isRecent ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last seen: {lastSeen.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PairingDialog
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        onPaired={() => {
          fetchConnections();
          setPairingOpen(false);
        }}
      />
    </AppLayout>
  );
}

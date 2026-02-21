"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconBrandUpwork } from "@tabler/icons-react";

export function UpworkConnectButton() {
  const status = useQuery(api.upwork.getConnectionStatus);
  const authUrl = useQuery(api.upwork.getAuthUrl);

  if (status === undefined) {
    return <Skeleton className="h-8 w-24" />;
  }

  if (status === "connected") {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5 cursor-default">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        <IconBrandUpwork className="size-4" />
        <span className="hidden sm:inline">Upwork</span>
      </Button>
    );
  }

  const handleConnect = () => {
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConnect}
      disabled={!authUrl}
      className="gap-1.5"
    >
      <IconBrandUpwork className="size-4" />
      <span className="hidden sm:inline">
        {status === "expired" ? "Reconnect" : "Connect Upwork"}
      </span>
    </Button>
  );
}

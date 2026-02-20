"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconBrandUpwork, IconCheck } from "@tabler/icons-react";

export function UpworkConnectCard() {
  const status = useQuery(api.upwork.getConnectionStatus);
  const authUrl = useQuery(api.upwork.getAuthUrl);

  const handleConnect = () => {
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  if (status === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardFooter>
          <Skeleton className="h-9 w-36" />
        </CardFooter>
      </Card>
    );
  }

  if (status === "connected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconBrandUpwork className="size-5" />
            Upwork
          </CardTitle>
          <CardDescription>
            Your Upwork account is connected. Discover jobs, send proposals, and
            track your funnel from here.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex items-center gap-2">
          <IconCheck className="size-4 text-green-600" />
          <span className="text-sm text-muted-foreground">Connected</span>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconBrandUpwork className="size-5" />
          Upwork
        </CardTitle>
        <CardDescription>
          {status === "expired"
            ? "Your Upwork connection has expired. Please reconnect."
            : "Connect your Upwork account to discover jobs, prepare and send proposals, and track your acquisition funnel."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={handleConnect} disabled={!authUrl}>
          <IconBrandUpwork className="mr-2 size-4" />
          {status === "expired" ? "Reconnect Upwork" : "Connect Upwork"}
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useMutation, useQuery } from "convex/react";
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

/** Upwork OAuth callback URL path. Full URL = origin + this path. */
const UPWORK_CALLBACK_PATH = "/api/upwork/callback";

export function UpworkConnectCard() {
  const status = useQuery(api.upwork.getConnectionStatus);
  const initiateConnect = useMutation(api.upwork.initiateConnect);

  const handleConnect = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectUri = `${origin}${UPWORK_CALLBACK_PATH}`;
    const { authUrl } = await initiateConnect({
      redirectUri: redirectUri || undefined,
    });
    window.location.href = authUrl;
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

  if (status.connected) {
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
          Connect your Upwork account to discover jobs, prepare and send
          proposals, and track your acquisition funnel.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={handleConnect}>
          <IconBrandUpwork className="mr-2 size-4" />
          Connect Upwork
        </Button>
      </CardFooter>
    </Card>
  );
}

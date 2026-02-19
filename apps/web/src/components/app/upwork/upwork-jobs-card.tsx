"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconBriefcase, IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatPostedDate(ms: number | undefined): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastRunAt(ms: number | null): string {
  if (ms == null) return "Never";
  const d = new Date(ms);
  const now = new Date();
  const isToday =
    d.getUTCDate() === now.getUTCDate() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCFullYear() === now.getUTCFullYear();
  if (isToday) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UpworkJobsCard() {
  const router = useRouter();
  const jobs = useQuery(api.upwork.listDiscoveredJobs, { appliedOnly: false });
  const discoveryStatus = useQuery(api.upwork.getDiscoveryStatus);
  const runDiscovery = useMutation(api.upwork.runDiscovery);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshError(null);
    setRefreshing(true);
    try {
      const result = await runDiscovery({});
      if (!result.allowed) {
        setRefreshError(result.message ?? "Refresh not allowed");
      }
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const atCap =
    discoveryStatus != null &&
    discoveryStatus.manualRefreshCountToday >= discoveryStatus.manualRefreshCap;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconBriefcase className="size-5" />
            Jobs to apply to
          </CardTitle>
          <CardDescription>
            Discovered Upwork jobs in your niche. Click a job to view details,
            add a Loom link, and send proposals.
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || atCap}
          >
            <IconRefresh
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh jobs
          </Button>
          {discoveryStatus != null && (
            <span className="text-muted-foreground text-xs">
              Last updated: {formatLastRunAt(discoveryStatus.lastRunAt)}
              {atCap &&
                ` · ${discoveryStatus.manualRefreshCountToday}/${discoveryStatus.manualRefreshCap} refreshes today`}
            </span>
          )}
          {atCap && (
            <span className="text-muted-foreground text-xs">
              Refresh limit reached for today. Try again tomorrow.
            </span>
          )}
          {refreshError != null && (
            <span className="text-destructive text-xs">{refreshError}</span>
          )}
        </div>
      </CardHeader>
      <div className="px-6 pb-6">
        {jobs === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : jobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No jobs in your list yet. Job discovery (e.g. by niche and budget
            &gt;$5K) will appear here once configured. Use &quot;Refresh
            jobs&quot; or wait for the daily sync.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow
                  key={j._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/upwork/jobs/${j._id}`)}
                >
                  <TableCell className="font-medium max-w-[280px] truncate">
                    {j.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {j.budgetInfo ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatPostedDate(j.postedAt ?? j._creationTime)}
                  </TableCell>
                  <TableCell>
                    {j.applied ? (
                      <Badge variant="secondary">Applied</Badge>
                    ) : (
                      <Badge variant="outline">To apply</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}

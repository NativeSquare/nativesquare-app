"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconExternalLink, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";

function formatPostedDate(ms: number | undefined): string {
  if (ms == null) return "\u2014";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBudget(
  amount?: number | null,
  currency?: string | null,
): string {
  if (amount == null) return "\u2014";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
  return fmt.format(amount);
}

export default function UpworkJobDetailPage() {
  const params = useParams();
  const jobId = params.jobId as Id<"discoveredJobs">;
  const job = useQuery(api.upwork.getDiscoveredJob, { jobId });

  if (job === undefined) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <p className="text-muted-foreground">Job not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/upwork">
            <IconArrowLeft className="size-4" />
            Back to jobs
          </Link>
        </Button>
      </div>
    );
  }

  const jobKey = job.upworkJobId.replace(/^~/, "");
  const upworkJobUrl = `https://www.upwork.com/jobs/~${jobKey}`;

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/upwork" className="gap-1">
            <IconArrowLeft className="size-4" />
            Back to jobs
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">
              {job.title ?? (
                <span className="text-muted-foreground italic">
                  Details expired
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Budget: {formatBudget(job.budgetAmount, job.budgetCurrency)}
              </span>
              <span>Posted: {formatPostedDate(job.postedAt)}</span>
              {job.applied && <Badge variant="secondary">Applied</Badge>}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a
              href={upworkJobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-1"
            >
              View on Upwork
              <IconExternalLink className="size-3.5" />
            </a>
          </Button>
        </CardHeader>

        {(job.clientCompanyName || job.clientTotalHires != null) && (
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {job.clientCompanyName && (
                <span>Client: {job.clientCompanyName}</span>
              )}
              {job.clientTotalHires != null && (
                <span>Total hires: {job.clientTotalHires}</span>
              )}
            </div>
          </CardContent>
        )}

        {job.description != null && job.description !== "" && (
          <CardContent className="pt-0">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {job.description}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

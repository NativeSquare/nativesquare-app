"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { IconExternalLink, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

function formatPostedDate(ms: number | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildPreGeneratedText(jobTitle: string, videoLink: string): string {
  return `Hi,

I've recorded a short video specifically for this role: ${videoLink}

I believe my experience is a strong match for "${jobTitle}". I'd welcome the chance to discuss how I can help you achieve your goals.

Best regards`;
}

export default function UpworkJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as Id<"discoveredJobs">;
  const job = useQuery(api.upwork.getDiscoveredJob, { jobId });
  const createProposal = useMutation(api.upwork.createProposal);
  const markJobApplied = useMutation(api.upwork.markJobApplied);

  const [videoLink, setVideoLink] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePreGenerate = () => {
    setProposalText(buildPreGeneratedText(job?.title ?? "", videoLink || ""));
  };

  const handleSubmit = async () => {
    if (!job) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const proposalId = await createProposal({
        upworkJobId: job.upworkJobId,
        upworkJobTitle: job.title,
        coverLetter: proposalText.trim() || "(No cover letter)",
        videoLink: videoLink.trim() || undefined,
        boosted: false,
      });
      await markJobApplied({ jobId, proposalId });
      router.push("/dashboard/upwork");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

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

  const upworkJobUrl = `https://www.upwork.com/jobs/~${job.upworkJobId}`;

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
          <div>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Budget: {job.budgetInfo ?? "—"}</span>
              <span>Posted: {formatPostedDate(job.postedAt)}</span>
              <a
                href={upworkJobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                View on Upwork
                <IconExternalLink className="size-3.5" />
              </a>
            </CardDescription>
          </div>
        </CardHeader>
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

      <Card>
        <CardHeader>
          <CardTitle>Apply</CardTitle>
          <CardDescription>
            Add your Loom or video link, pre-generate the proposal text, edit if
            needed, then submit to record the proposal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-link">Loom / video link</Label>
            <Input
              id="video-link"
              type="url"
              placeholder="https://www.loom.com/share/..."
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={handlePreGenerate}>
            Pre-generate application
          </Button>
          <div className="space-y-2">
            <Label htmlFor="proposal-text">Proposal text (editable)</Label>
            <Textarea
              id="proposal-text"
              rows={10}
              placeholder="Click “Pre-generate application” or write your cover letter here."
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              className="resize-y"
            />
          </div>
          {submitError != null && (
            <p className="text-destructive text-sm">{submitError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !proposalText.trim()}
            >
              {submitting ? "Submitting…" : "Submit proposal (record only)"}
            </Button>
            <Button asChild variant="outline">
              <a
                href={upworkJobUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open on Upwork to apply there
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

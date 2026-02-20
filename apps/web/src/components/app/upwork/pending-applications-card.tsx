"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconCheck,
  IconClipboardList,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  submitted: { label: "Submitted", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export function PendingApplicationsCard() {
  const applications = useQuery(api.autoApply.listPendingApplications);
  const approve = useMutation(api.autoApply.approveApplication);
  const reject = useMutation(api.autoApply.rejectApplication);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(id: Id<"pendingApplications">) {
    setLoadingId(id);
    try {
      await approve({ applicationId: id });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(id: Id<"pendingApplications">) {
    setLoadingId(id);
    try {
      await reject({ applicationId: id });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconClipboardList className="size-5" />
          Pending Applications
        </CardTitle>
        <CardDescription>
          Review and approve auto-generated proposals before they are submitted
          to Upwork.
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6">
        {applications === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : applications.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No pending applications. Enable auto-apply and wait for the next
            discovery run.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => {
                const config = STATUS_CONFIG[app.status] ?? {
                  label: app.status,
                  variant: "outline" as const,
                };
                const isLoading = loadingId === app._id;
                const isPending = app.status === "pending";

                return (
                  <TableRow key={app._id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate">{app.jobTitle}</div>
                      {app.errorMessage && (
                        <p className="text-xs text-destructive mt-1 truncate">
                          {app.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {app.budgetAmount
                        ? `$${app.budgetAmount.toLocaleString()}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(app.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(app._id)}
                            disabled={isLoading}
                            title="Approve & submit"
                          >
                            {isLoading ? (
                              <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                              <IconCheck className="size-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(app._id)}
                            disabled={isLoading}
                            title="Reject"
                          >
                            <IconX className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}

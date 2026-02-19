"use client";

import { useQuery } from "convex/react";
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
import { IconChartFunnel } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  sent: "Sent",
  viewed: "Viewed",
  loom_viewed: "Loom viewed",
  interviewing: "Interviewing",
  signed: "Signed",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  sent: "secondary",
  viewed: "outline",
  loom_viewed: "outline",
  interviewing: "default",
  signed: "default",
};

export function UpworkFunnelCard() {
  const proposals = useQuery(api.upwork.listProposals);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconChartFunnel className="size-5" />
          Proposal funnel
        </CardTitle>
        <CardDescription>
          Sent → Viewed → Loom viewed → Interviewing → Signed
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6">
        {proposals === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : proposals.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No proposals yet. Connect Upwork and send proposals to see your
            funnel here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Boosted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {p.upworkJobTitle}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[p.status] ?? "outline"}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(p.sentAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell>{p.boosted ? "Yes" : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}

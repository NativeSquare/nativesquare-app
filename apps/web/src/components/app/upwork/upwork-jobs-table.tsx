"use client";

import * as React from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RelevanceTier = "gold" | "silver" | "bronze";

type DiscoveredJob = {
  _id: string;
  _creationTime: number;
  upworkJobId: string;
  title: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  relevanceTier?: RelevanceTier;
  postedAt?: number;
  applied: boolean;
};

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

function formatPostedDate(ms: number | undefined): string {
  if (ms == null) return "\u2014";
  const now = Date.now();
  const diffMs = now - ms;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const relevanceConfig: Record<
  RelevanceTier,
  { label: string; className: string }
> = {
  gold: {
    label: "Gold",
    className:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  },
  silver: {
    label: "Silver",
    className:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600",
  },
  bronze: {
    label: "Bronze",
    className:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700",
  },
};

const relevanceOrder: Record<RelevanceTier, number> = {
  gold: 3,
  silver: 2,
  bronze: 1,
};

const columns: Array<ColumnDef<DiscoveredJob>> = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium line-clamp-1 max-w-[320px]">
        {row.original.title ?? (
          <span className="text-muted-foreground italic">Details expired</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "budgetAmount",
    header: "Budget",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatBudget(row.original.budgetAmount, row.original.budgetCurrency)}
      </span>
    ),
  },
  {
    accessorKey: "relevanceTier",
    header: "Relevance",
    sortingFn: (rowA, rowB) => {
      const a = relevanceOrder[rowA.original.relevanceTier as RelevanceTier] ?? 0;
      const b = relevanceOrder[rowB.original.relevanceTier as RelevanceTier] ?? 0;
      return a - b;
    },
    cell: ({ row }) => {
      const tier = row.original.relevanceTier;
      if (!tier) return <span className="text-muted-foreground">\u2014</span>;
      const config = relevanceConfig[tier];
      return (
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "postedAt",
    header: "Posted",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatPostedDate(row.original.postedAt ?? row.original._creationTime)}
      </span>
    ),
  },
  {
    accessorKey: "applied",
    header: "Status",
    cell: ({ row }) =>
      row.original.applied ? (
        <Badge variant="secondary">Applied</Badge>
      ) : (
        <Badge variant="outline">New</Badge>
      ),
  },
];

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

export function UpworkJobsTable() {
  const router = useRouter();
  const {
    results: jobs,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.upwork.listDiscoveredJobs,
    {},
    { initialNumItems: 100 },
  );

  const discoveryStatus = useQuery(api.upwork.getDiscoveryStatus);
  const runDiscovery = useMutation(api.upwork.runDiscovery);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "relevanceTier", desc: true },
  ]);

  React.useEffect(() => {
    if (status === "CanLoadMore") {
      loadMore(100);
    }
  }, [status, loadMore]);

  const table = useReactTable({
    data: jobs as DiscoveredJob[],
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

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

  const isLoading = status === "LoadingFirstPage";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Discovered Jobs</h2>
          <p className="text-muted-foreground text-sm">
            Upwork jobs matching your niche. Click a job for details.
          </p>
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
                ` \u00b7 ${discoveryStatus.manualRefreshCountToday}/${discoveryStatus.manualRefreshCap} refreshes today`}
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
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No jobs discovered yet. Use &quot;Refresh jobs&quot; to fetch the
            latest postings.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(
                          `/dashboard/upwork/jobs/${row.original._id}`,
                        )
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="text-muted-foreground hidden text-sm lg:block">
              {table.getFilteredRowModel().rows.length} job(s) total
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label
                  htmlFor="rows-per-page"
                  className="text-sm font-medium"
                >
                  Rows per page
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-20"
                    id="rows-per-page"
                  >
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <IconChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <IconChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <IconChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() =>
                    table.setPageIndex(table.getPageCount() - 1)
                  }
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <IconChevronsRight />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

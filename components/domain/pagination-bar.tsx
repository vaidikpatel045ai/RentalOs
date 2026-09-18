"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, getTotalPages } from "@/lib/pagination";

/**
 * Shared list-screen pagination: a "results per page" select plus prev/next,
 * all synced to the URL (?page=&pageSize=) alongside whatever FilterBar
 * params are already there — every list screen (Inventory, Customers,
 * Bookings, Appointments, Staff, Audit Log, Payments, Tailoring, Cleaning,
 * Delivery) uses the same control so paging behaves identically everywhere.
 */
export function PaginationBar({
  page,
  pageSize,
  totalCount,
  itemLabel = "results",
  pageParam = "page",
  pageSizeParam = "pageSize",
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  itemLabel?: string;
  /** Override when a page renders more than one paginated list at once
   * (e.g. Payments' Payments/Deposits tabs) so each gets its own URL state. */
  pageParam?: string;
  pageSizeParam?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = getTotalPages(totalCount, pageSize);

  function go(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setPage(next: number) {
    go((params) => {
      if (next <= 1) params.delete(pageParam);
      else params.set(pageParam, String(next));
    });
  }

  function setPageSize(next: string) {
    go((params) => {
      params.set(pageSizeParam, next);
      params.delete(pageParam); // page size changed — start back at page 1
    });
  }

  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalCount, page * pageSize);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {start.toLocaleString()}–{end.toLocaleString()} of {totalCount.toLocaleString()} {itemLabel}
        </span>
        <Select value={String(pageSize)} onValueChange={setPageSize}>
          <SelectTrigger size="sm" className="w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="hidden sm:inline">per page</span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="min-w-16 text-center text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

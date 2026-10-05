import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MonthRange } from "@/lib/month";

/** Previous / next month links that keep every other filter in the URL. */
export function MonthNav({
  basePath,
  month,
  params,
}: {
  basePath: string;
  month: MonthRange;
  params: Record<string, string | undefined>;
}) {
  function hrefFor(key: string) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "month" && k !== "page") search.set(k, v);
    }
    search.set("month", key);
    return `${basePath}?${search.toString()}`;
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="icon-sm" aria-label="Previous month">
        <Link href={hrefFor(month.prevKey)}>
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <span className="min-w-32 text-center text-sm font-medium">{month.label}</span>
      {month.isCurrent ? (
        <Button variant="outline" size="icon-sm" disabled aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
      ) : (
        <Button asChild variant="outline" size="icon-sm" aria-label="Next month">
          <Link href={hrefFor(month.nextKey)}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  /** URL search param key this filter reads/writes. */
  key: string;
  label: string;
  options: FilterOption[];
  placeholder?: string;
}

const ALL_VALUE = "__all__";

/**
 * Shared list-screen filter bar: a debounced search box plus any number of
 * select filters, all synced to the URL (?q=&status=&branchId=…) so
 * filtering is server-driven, shareable and survives a refresh. Shows the
 * currently applied filters as removable chips, matching the pattern across
 * every list screen (customers, garments, bookings, appointments, staff,
 * audit log).
 */
export function FilterBar({
  searchKey,
  searchPlaceholder = "Search…",
  filters = [],
}: {
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSearchValue = searchKey ? (searchParams.get(searchKey) ?? "") : "";

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  function onSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        if (value.trim()) params.set(searchKey!, value);
        else params.delete(searchKey!);
      });
    }, 350);
  }

  function onSelectChange(key: string, value: string) {
    pushParams((params) => {
      if (value === ALL_VALUE) params.delete(key);
      else params.set(key, value);
    });
  }

  function clearOne(key: string) {
    pushParams((params) => params.delete(key));
  }

  function clearAll() {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const activeChips: { key: string; label: string }[] = [];
  if (searchKey && currentSearchValue) {
    activeChips.push({ key: searchKey, label: `"${currentSearchValue}"` });
  }
  for (const filter of filters) {
    const value = searchParams.get(filter.key);
    if (!value) continue;
    const option = filter.options.find((o) => o.value === value);
    activeChips.push({ key: filter.key, label: `${filter.label}: ${option?.label ?? value}` });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {searchKey && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            {/* Uncontrolled + keyed on the URL value: remounts (and resets)
                whenever the value changes externally (chip clear, back/
                forward), without needing an effect to sync local state. */}
            <Input
              key={currentSearchValue}
              defaultValue={currentSearchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
        )}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={searchParams.get(filter.key) ?? ALL_VALUE}
            onValueChange={(v) => onSelectChange(filter.key, v)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={filter.placeholder ?? filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All {filter.label}</SelectItem>
              {filter.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {activeChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 font-normal">
              {chip.label}
              <button
                type="button"
                onClick={() => clearOne(chip.key)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Shirt, ClipboardList, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/app/api/search/route";

const ICON_BY_TYPE = {
  customer: User,
  garment: Shirt,
  booking: ClipboardList,
} as const;

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const isQueryTooShort = query.trim().length < 2;
  const visibleResults = isQueryTooShort ? [] : results;
  const isLoading = !isQueryTooShort && loading;

  return (
    <>
      {/* Icon-only on phones — a fixed-width labeled button doesn't fit
          next to the menu trigger and avatar at narrow viewports. */}
      <Button
        variant="outline"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden w-56 justify-start text-muted-foreground sm:flex md:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="truncate">Search customers, garments, bookings…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search by name, phone, SKU or booking number…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : (
            <>
              <CommandEmpty>{isQueryTooShort ? "Type at least 2 characters." : "No results found."}</CommandEmpty>
              {visibleResults.length > 0 && (
                <CommandGroup heading="Results">
                  {visibleResults.map((r) => {
                    const Icon = ICON_BY_TYPE[r.type];
                    return (
                      <CommandItem key={`${r.type}-${r.id}`} onSelect={() => go(r.href)}>
                        <Icon className="size-4" />
                        <div className="flex flex-col">
                          <span>{r.title}</span>
                          <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

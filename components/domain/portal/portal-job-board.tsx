import { CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type GroupKey = "overdue" | "today" | "upcoming" | "completed";

const TILES: { key: GroupKey; label: string; accent: string }[] = [
  { key: "overdue", label: "Overdue", accent: "text-risk-unsafe" },
  { key: "today", label: "Due today", accent: "text-risk-tight" },
  { key: "upcoming", label: "Upcoming", accent: "text-foreground" },
  { key: "completed", label: "Done", accent: "text-risk-safe" },
];

/**
 * The tailor/cleaner workload view: four count tiles that double as tabs
 * (2×2 on phones, a row from tablet up), then that group's job cards in one
 * column on phones and two on wide screens.
 */
export function PortalJobBoard({
  groups,
  emptyText,
}: {
  groups: Record<GroupKey, React.ReactNode[]>;
  emptyText: Record<GroupKey, string>;
}) {
  const initial: GroupKey = groups.overdue.length > 0 ? "overdue" : groups.today.length > 0 ? "today" : "upcoming";

  return (
    <Tabs defaultValue={initial} className="gap-5">
      <TabsList
        className="grid w-full max-w-none grid-cols-2 gap-2 overflow-visible bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto sm:grid-cols-4 sm:gap-3"
        data-tour="page-filters"
      >
        {TILES.map((tile) => (
          <TabsTrigger
            key={tile.key}
            value={tile.key}
            className={cn(
              "h-auto flex-col items-start gap-0.5 rounded-xl border border-border bg-card px-4 py-3 text-left whitespace-normal shadow-none",
              "data-[state=active]:border-foreground/70 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            )}
          >
            <span className="text-xs font-normal text-muted-foreground">{tile.label}</span>
            <span className={cn("font-heading text-2xl leading-tight", groups[tile.key].length > 0 ? tile.accent : "text-muted-foreground")}>
              {groups[tile.key].length}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {TILES.map((tile) => (
        <TabsContent key={tile.key} value={tile.key} data-tour="page-content">
          {groups[tile.key].length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="size-7 text-risk-safe" />
              {emptyText[tile.key]}
            </div>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2">{groups[tile.key]}</div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Greeting line for the portal pages, in the branch's own timezone. */
export function PortalGreeting({
  name,
  timezone,
  title,
  summary,
}: {
  name: string;
  timezone: string;
  title: string;
  summary: string;
}) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(now);
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-1" data-tour="page-header">
      <p className="text-sm text-muted-foreground">
        {greeting}, {firstName} · {today}
      </p>
      <h1 className="font-heading text-2xl sm:text-3xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{summary}</p>
    </div>
  );
}

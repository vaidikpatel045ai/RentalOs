import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "gold" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    gold: "text-gold",
    warning: "text-risk-tight",
    danger: "text-risk-unsafe",
  }[tone];

  return (
    <Card className="gap-2 py-4 sm:py-5">
      <CardContent className="flex items-start justify-between gap-2 px-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn("truncate font-heading text-lg sm:text-2xl", toneClass)}
            title={typeof value === "string" ? value : undefined}
          >
            {value}
          </p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="shrink-0 rounded-full bg-muted p-2">
            <Icon className={cn("size-4", toneClass)} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getNavItemsForRole } from "@/lib/nav-config";

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <span className="font-heading text-lg tracking-tight">Bridal Rental OS</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60">
        Every garment. Every bride.
        <br />
        Every workflow. One system.
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { Menu, LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommandSearch } from "@/components/domain/command-search";
import { NotificationBell } from "@/components/domain/notification-bell";
import { getNavItemsForRole } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import type { Notification } from "@prisma/client";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppTopbar({
  name,
  email,
  role,
  branchName,
  unreadCount,
  notifications,
}: {
  name: string;
  email: string;
  role: Role;
  branchName?: string | null;
  unreadCount: number;
  notifications: Notification[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const items = getNavItemsForRole(role);

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center border-b px-6 font-heading text-lg">
            Bridal Rental OS
          </div>
          <nav className="space-y-0.5 p-3">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <CommandSearch />

      <div className="ml-auto flex items-center gap-3">
        {branchName ? (
          <span className="hidden rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:inline">
            {branchName}
          </span>
        ) : null}
        <NotificationBell unreadCount={unreadCount} notifications={notifications} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-gold/15 text-xs text-gold">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs font-normal text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="size-4" /> Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

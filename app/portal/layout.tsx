import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Shared shell for the mobile-first operational portals (Tailor, Cleaner,
// Delivery, Customer). Deliberately minimal — no admin sidebar — per spec
// section 41 ("Do NOT overwhelm the tailor or cleaner with admin
// functionality"). This gives every role a real, branded landing spot
// after login instead of a dead end.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = session.user.name ?? session.user.email ?? "User";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <span className="font-heading text-lg tracking-tight">Bridal Rental OS</span>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar className="size-7">
              <AvatarFallback className="bg-gold/15 text-xs text-gold">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" className="sm:hidden" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
            <Button type="submit" variant="ghost" size="sm" className="hidden sm:inline-flex">
              <LogOut className="size-4" /> Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}

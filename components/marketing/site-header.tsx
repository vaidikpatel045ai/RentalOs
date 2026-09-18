"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#lifecycle", label: "Garment lifecycle" },
  { href: "#portals", label: "Portals" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="font-heading text-lg tracking-tight">
          Bridal Rental OS
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gold text-gold-foreground hover:bg-gold/90">
            <a href="#inquiry">Book a demo</a>
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="mt-10 flex flex-col gap-1 px-2">
              {LINKS.map((link) => (
                <SheetClose asChild key={link.href}>
                  <a href={link.href} className="rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent">
                    {link.label}
                  </a>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2 px-2">
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
                  <a href="#inquiry">Book a demo</a>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

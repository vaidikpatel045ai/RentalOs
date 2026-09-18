import { ArrowRight, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--primary-foreground) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-6 pt-20 pb-24 md:px-10 md:pt-28 md:pb-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <h1 className="max-w-xl font-heading text-4xl leading-[1.08] md:text-5xl lg:text-[3.25rem]">
            Know where every gown is — and whether it&apos;s safe to book again.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-primary-foreground/70">
            Bridal Rental OS replaces the WhatsApp threads, paper tags and spreadsheets your boutique runs on today
            with one system that tracks each gown from fitting to return, and warns you before a booking conflict
            ever reaches a bride.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
              <a href="#inquiry">
                Book a demo <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <p className="mt-8 text-xs text-primary-foreground/50">
            Built for bridal &amp; formalwear rental boutiques in Dubai, Abu Dhabi and Sharjah.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-primary-foreground/10 bg-card p-5 text-card-foreground shadow-2xl shadow-black/30 sm:p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-heading text-sm">Gown BR-102</p>
                <p className="text-xs text-muted-foreground">Sarah Ahmed · Reception gown</p>
              </div>
              <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-medium text-gold">Booked</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Return due</span>
                <span className="font-medium">Today, 6:00 PM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next booking</span>
                <span className="font-medium">Tomorrow, 10:00 AM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cleaning turnaround</span>
                <span className="font-medium">8 hours</span>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-risk-safe/25 bg-risk-safe/10 p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-risk-safe">
                <span className="size-1.5 rounded-full bg-risk-safe" />
                Safe to book
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cleaning finishes by 2:00 AM — 8 hours of buffer before the next fitting.
              </p>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-xl sm:flex">
            <Sparkle className="size-4 text-gold" />
            <div className="text-xs">
              <p className="font-medium">23 rentals · AED 276,000</p>
              <p className="text-muted-foreground">Lifetime revenue on this gown</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

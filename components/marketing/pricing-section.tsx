import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIERS = [
  {
    name: "Starter",
    branches: "1 branch",
    price: "AED 799",
    period: "/month",
    features: [
      "Full inventory & booking system",
      "Availability engine",
      "Customer & measurement records",
      "Tailor & cleaner portals",
      "Up to 5 staff accounts",
    ],
    emphasized: false,
  },
  {
    name: "Growth",
    branches: "2–5 branches",
    price: "AED 1,999",
    period: "/month",
    features: [
      "Everything in Starter",
      "Multi-branch inventory & staff",
      "Delivery & pickup coordination",
      "Business intelligence & ROI reports",
      "Unlimited staff accounts",
    ],
    emphasized: true,
  },
  {
    name: "Multi-Branch",
    branches: "6+ branches",
    price: "Custom",
    period: "",
    features: [
      "Everything in Growth",
      "Dedicated onboarding",
      "Priority support",
      "Custom reporting",
      "Volume pricing",
    ],
    emphasized: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-b border-border px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">Priced by how many branches you run.</h2>
          <p className="mt-4 text-muted-foreground">
            Every plan includes the full operations system — inventory, bookings, tailoring, cleaning and delivery.
            No feature gates on the essentials.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.emphasized
                  ? "rounded-xl bg-gold p-6 text-gold-foreground"
                  : "rounded-xl border border-border bg-card p-6"
              }
            >
              <p className="font-heading text-lg">{tier.name}</p>
              <p className={tier.emphasized ? "text-sm text-gold-foreground/70" : "text-sm text-muted-foreground"}>
                {tier.branches}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-heading text-3xl">{tier.price}</span>
                {tier.period && (
                  <span className={tier.emphasized ? "text-sm text-gold-foreground/70" : "text-sm text-muted-foreground"}>
                    {tier.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={
                  tier.emphasized
                    ? "mt-7 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    : "mt-7 w-full"
                }
                variant={tier.emphasized ? "default" : "outline"}
              >
                <a href="#inquiry">{tier.price === "Custom" ? "Talk to us" : "Book a demo"}</a>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Prices shown in AED for the UAE market. Setting up a US branch? Mention it in the form below — pricing and
          tax handling adjust automatically per branch.
        </p>
      </div>
    </section>
  );
}

const STAGES = [
  "Booked",
  "Fitting",
  "Tailoring",
  "Ready",
  "Pickup",
  "Return",
  "Inspection",
  "Cleaning",
  "Quality check",
  "Available",
];

const STATS = [
  { label: "Rentals", value: "23" },
  { label: "Lifetime revenue", value: "AED 276,000" },
  { label: "Return on investment", value: "3.68×" },
  { label: "Condition score", value: "9.2 / 10" },
];

export function LifecycleSection() {
  return (
    <section id="lifecycle" className="border-b border-border bg-secondary/30 px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">Ten stages. One gown. Fully tracked.</h2>
          <p className="mt-4 text-muted-foreground">
            Scan the QR tag on any gown and see exactly where it is in this sequence — and everything that&apos;s
            happened to it before.
          </p>
        </div>

        <ol className="mt-14 flex flex-wrap gap-x-2 gap-y-4">
          {STAGES.map((stage, i) => (
            <li key={stage} className="flex items-center gap-2">
              <div className="flex items-center gap-2.5 rounded-full border border-border bg-background py-2 pr-4 pl-2.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{stage}</span>
              </div>
              {i < STAGES.length - 1 && <span className="text-border" aria-hidden>›</span>}
            </li>
          ))}
        </ol>

        <div className="mt-14 grid grid-cols-2 gap-6 rounded-xl border border-border bg-background p-6 sm:grid-cols-4 sm:p-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-heading text-2xl text-gold">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Gown BR-102 — illustrative example from the demo boutique.</p>
      </div>
    </section>
  );
}

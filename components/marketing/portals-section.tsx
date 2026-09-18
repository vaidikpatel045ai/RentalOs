const PORTALS = [
  {
    role: "Tailor",
    heading: "My tasks today",
    rows: [
      { label: "Sarah Ahmed · BR-102", meta: "Due 18 Sep · High priority" },
      { label: "Hem −1.5\" · Bust +0.5\" · Straps −0.5\"", meta: "Measurements from fitting" },
    ],
    cta: "Start work",
  },
  {
    role: "Cleaner",
    heading: "Cleaning queue",
    rows: [
      { label: "BR-102 · Delicate dry clean", meta: "Stain noted: left sleeve" },
      { label: "Cleaning → Quality check → Ready", meta: "8 hour turnaround" },
    ],
    cta: "Mark cleaning done",
  },
  {
    role: "Delivery",
    heading: "Delivery #DL-102",
    rows: [
      { label: "Sarah Ahmed · Dubai Marina", meta: "6:00 PM – 7:00 PM" },
      { label: "Status: Out for delivery", meta: "Gown BR-102" },
    ],
    cta: "Confirm delivered",
  },
];

export function PortalsSection() {
  return (
    <section id="portals" className="border-b border-border px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">
            Your team gets exactly what they need — nothing else.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tailors, cleaners and delivery staff each open a focused portal on their own phone or tablet: today&apos;s
            tasks, one tap to move a gown forward, no back-office clutter.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PORTALS.map((p) => (
            <div key={p.role} className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-medium text-gold">{p.role} portal</p>
              <p className="mt-1 font-heading text-lg">{p.heading}</p>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {p.rows.map((row) => (
                  <div key={row.label}>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{row.meta}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md bg-primary py-2 text-center text-xs font-medium text-primary-foreground">
                {p.cta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

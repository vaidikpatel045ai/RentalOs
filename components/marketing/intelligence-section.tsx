export function IntelligenceSection() {
  return (
    <section className="border-b border-border bg-primary px-6 py-20 text-primary-foreground md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">
            Turn rental data into inventory decisions.
          </h2>
          <p className="mt-4 text-primary-foreground/70">
            Every rental, alteration and cleaning cycle is recorded against the gown that earned it — so the pieces
            worth reordering, and the ones worth selling off, are obvious.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-6">
            <p className="text-xs font-medium text-risk-safe">Top performer</p>
            <p className="mt-2 font-heading text-xl">BR-102</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-heading text-3xl">AED 276,000</span>
              <span className="text-sm text-primary-foreground/60">lifetime revenue</span>
            </div>
            <p className="mt-1 text-sm text-primary-foreground/60">23 rentals · 3.68× return on investment</p>
          </div>

          <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-6">
            <p className="text-xs font-medium text-risk-unsafe">Underperforming</p>
            <p className="mt-2 font-heading text-xl">BR-875</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-heading text-3xl">AED 7,000</span>
              <span className="text-sm text-primary-foreground/60">earned on AED 30,000 invested</span>
            </div>
            <p className="mt-1 text-sm text-primary-foreground/60">2 rentals · 92 days idle · consider promotion or sale</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t border-primary-foreground/10 pt-8 sm:grid-cols-2">
          <div>
            <p className="font-heading text-lg">Multi-branch by design</p>
            <p className="mt-2 text-sm text-primary-foreground/60">
              Run Dubai, Abu Dhabi and Sharjah as one business. Staff, inventory and reports scope to a branch
              automatically — an owner sees everything, everyone else sees their own.
            </p>
          </div>
          <div>
            <p className="font-heading text-lg">Access that matches the role</p>
            <p className="mt-2 text-sm text-primary-foreground/60">
              Owners, managers, sales, stylists, tailors, cleaners and delivery staff each get exactly the access
              their job needs — enforced on every action, not just hidden in the menu.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

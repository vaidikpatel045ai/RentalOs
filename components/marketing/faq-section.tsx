const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most boutiques are live within a week. We import your existing inventory and customer list, set up your branches and staff accounts, and walk your team through the tailor, cleaner and delivery portals before launch.",
  },
  {
    q: "Can it handle more than bridal gowns?",
    a: "Yes — the same system tracks evening gowns, abayas, veils, jewellery and bridesmaid pieces. Anything you rent or sell can be modeled as a garment with its own status and history.",
  },
  {
    q: "What happens if two bookings risk overlapping?",
    a: "The availability engine checks cleaning and repair turnaround against the next booking before a reservation is confirmed, and flags it as safe, tight or unsafe with the reasoning shown — so staff catch a conflict before it reaches a bride, not after.",
  },
  {
    q: "Does each staff role see everything?",
    a: "No. Access is scoped by role and enforced on every action, not just hidden in the menu — a stylist can't edit payments, a tailor only sees their assigned jobs, and only an owner sees data across every branch.",
  },
  {
    q: "Is this only for the UAE?",
    a: "It's built UAE-first — AED pricing, VAT and Dubai/Abu Dhabi/Sharjah out of the box — but currency, tax and address handling are configurable per branch, so it's ready for a US location when you are.",
  },
  {
    q: "Can I cancel or change plans later?",
    a: "Yes, plans scale with your branch count and there's no lock-in contract. Tell us what changed and we'll adjust your plan at your next billing cycle.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="border-b border-border bg-secondary/30 px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl leading-tight md:text-4xl">Questions boutique owners ask</h2>

        <div className="mt-10 divide-y divide-border border-t border-border">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base marker:content-none">
                {item.q}
                <span className="shrink-0 text-xl text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

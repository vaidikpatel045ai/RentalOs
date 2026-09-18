const VIGNETTES = [
  {
    quote: "Which dress is this for?",
    role: "Tailor, checking a handwritten note",
  },
  {
    quote: "Is BR-102 back from cleaning yet?",
    role: "Sales, scrolling three WhatsApp chats",
  },
  {
    quote: "Wait — didn't we already book this one out?",
    role: "Owner, comparing two calendars",
  },
];

export function ProblemSection() {
  return (
    <section id="how-it-works" className="border-b border-border bg-secondary/30 px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">
            Running a boutique means managing far more than dresses.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Bookings, fittings, alterations, cleaning, payments, deliveries and returns are all happening at once —
            usually tracked across a phone, a spreadsheet and a stack of paper tags.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {VIGNETTES.map((v) => (
            <div key={v.quote} className="bg-background p-6">
              <p className="font-heading text-lg leading-snug">&ldquo;{v.quote}&rdquo;</p>
              <p className="mt-3 text-sm text-muted-foreground">{v.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

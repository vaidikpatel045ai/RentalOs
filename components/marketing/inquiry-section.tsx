import { InquiryForm } from "@/components/marketing/inquiry-form";

export function InquirySection() {
  return (
    <section id="inquiry" className="px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">
            See your boutique running on Bridal Rental OS.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Tell us a little about your business and we&apos;ll walk you through the system with your own kind of
            inventory and bookings — no generic sales deck.
          </p>

          <dl className="mt-10 space-y-5 border-t border-border pt-8">
            <div>
              <dt className="font-heading text-sm">What to expect</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                A 30-minute walkthrough, tailored to your boutique&apos;s branches and gown count.
              </dd>
            </div>
            <div>
              <dt className="font-heading text-sm">Response time</dt>
              <dd className="mt-1 text-sm text-muted-foreground">We reply within one business day.</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <InquiryForm />
        </div>
      </div>
    </section>
  );
}

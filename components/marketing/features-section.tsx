const FEATURES = [
  {
    title: "One record per gown",
    description:
      "Every gown gets a profile: components, condition history, QR tag, every booking it's ever been on, and what it earned.",
  },
  {
    title: "An availability engine, not a calendar",
    description:
      "Before a booking is confirmed, the system checks cleaning and repair turnaround against the next booking and tells you SAFE, TIGHT or UNSAFE — with the reasoning shown.",
  },
  {
    title: "Measurements that reach the tailor",
    description:
      "A bride's measurements are captured once at fitting and follow the gown to whoever alters it next — no re-measuring, no lost notes.",
  },
  {
    title: "A dashboard built for the owner's morning",
    description:
      "Today's appointments, trials, pickups, returns, pending payments and deposits held — and which bookings need attention right now.",
  },
  {
    title: "Role-scoped portals",
    description:
      "Tailors, cleaners and delivery staff see a focused task list for their own work, not the full back office.",
  },
  {
    title: "Multi-branch from day one",
    description:
      "Run Dubai, Abu Dhabi and Sharjah as one business or three — staff, inventory and reporting all scope cleanly by branch.",
  },
];

export function FeaturesSection() {
  return (
    <section className="border-b border-border px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl leading-tight md:text-4xl">
            Every garment. Every bride. Every workflow. One system.
          </h2>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-l-2 border-gold/40 pl-5">
              <h3 className="font-heading text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

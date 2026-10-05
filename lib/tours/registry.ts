import type { TourConfig, TourStep } from "@/lib/tours/types";

/** Standard 4-beat shape shared by almost every list/admin tab: header,
 * primary action, filters, main content. Any step is omitted by passing
 * `undefined`, and any step whose target isn't in the DOM (e.g. a
 * create button hidden for the viewer's role) is skipped automatically at
 * runtime — see TourOverlay. */
function tabTour(
  id: string,
  steps: {
    header?: Omit<TourStep, "target">;
    action?: Omit<TourStep, "target">;
    filters?: Omit<TourStep, "target">;
    content?: Omit<TourStep, "target">;
    secondary?: Omit<TourStep, "target">;
  }
): TourConfig {
  const out: TourStep[] = [];
  if (steps.header) out.push({ target: '[data-tour="page-header"]', placement: "bottom", ...steps.header });
  if (steps.action) out.push({ target: '[data-tour="page-action"]', placement: "left", ...steps.action });
  if (steps.filters) out.push({ target: '[data-tour="page-filters"]', placement: "bottom", ...steps.filters });
  if (steps.content) out.push({ target: '[data-tour="page-content"]', placement: "top", ...steps.content });
  if (steps.secondary) out.push({ target: '[data-tour="page-secondary"]', placement: "top", ...steps.secondary });
  return { id, steps: out };
}

const TOURS: Record<string, TourConfig> = {
  "/dashboard/owner": {
    id: "dashboard.owner",
    steps: [
      {
        target: '[data-tour="page-header"]',
        title: "Welcome to your Command Center",
        content: "Everything happening across every branch, at a glance. This is where your day starts.",
        placement: "bottom",
      },
      {
        target: '[data-tour="kpi-today"]',
        title: "Today",
        content: "Appointments, trials, pickups and returns due today — across all branches.",
        placement: "bottom",
      },
      {
        target: '[data-tour="kpi-operations"]',
        title: "Operations",
        content: "Alterations and cleaning due, overdue returns, and pending payments. Orange or red means it needs attention.",
        placement: "bottom",
      },
      {
        target: '[data-tour="kpi-inventory"]',
        title: "Inventory Position",
        content: "Deposits held and where your garments physically are right now — out, cleaning, or with a tailor.",
        placement: "bottom",
      },
      {
        target: '[data-tour="chart-risk"]',
        title: "Revenue & At-Risk Bookings",
        content:
          "The availability engine flags any booking where cleaning or repair turnaround is tight or unsafe before it becomes a real problem.",
        placement: "top",
      },
      {
        target: '[data-tour="kpi-advanced"]',
        title: "Operational KPIs",
        content: "Utilization, ROI, turnaround times and damage rate — the numbers that tell you if the business is healthy.",
        placement: "top",
      },
    ],
  },

  "/dashboard/manager": {
    id: "dashboard.manager",
    steps: [
      { target: '[data-tour="page-header"]', title: "Your branch, today", content: "The operational picture for your branch specifically.", placement: "bottom" },
      { target: '[data-tour="kpi-today"]', title: "Today", content: "Appointments, trials, pickups and returns due today.", placement: "bottom" },
      { target: '[data-tour="kpi-operations"]', title: "Operations", content: "Alterations and cleaning due, overdue returns, pending payments.", placement: "bottom" },
      { target: '[data-tour="page-secondary"]', title: "At-Risk Bookings", content: "Bookings where turnaround is tight or unsafe — catch a conflict before a bride does.", placement: "top" },
    ],
  },

  "/dashboard/sales": {
    id: "dashboard.sales",
    steps: [
      { target: '[data-tour="page-header"]', title: "Front Desk", content: "Your daily view: who's coming in today, and what's just been booked.", placement: "bottom" },
      { target: '[data-tour="page-action"]', title: "Start something new", content: "Book an appointment or a rental straight from here.", placement: "left" },
      { target: '[data-tour="page-content"]', title: "Today's Appointments", content: "Everyone scheduled to come in today, in order.", placement: "top" },
      { target: '[data-tour="page-secondary"]', title: "Recent Bookings", content: "The latest bookings for your branch — tap one to open it.", placement: "top" },
    ],
  },

  "/dashboard/stylist": {
    id: "dashboard.stylist",
    steps: [
      { target: '[data-tour="page-header"]', title: "Styling Schedule", content: "Your upcoming consultations, dress selections and fittings.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "Upcoming", content: "Sorted soonest first — nothing to dig for.", placement: "top" },
    ],
  },

  "/dashboard/bookings": tabTour("dashboard.bookings", {
    header: { title: "Bookings", content: "Every rental booking across your branches, from draft to completed." },
    action: { title: "New Booking", content: "Start the booking wizard — it checks the availability engine live as you pick garments and dates." },
    filters: { title: "Search & Filter", content: "Narrow by status, branch or search — the URL updates so you can bookmark or share a filtered view." },
    content: { title: "The List", content: "Tap any row to open its full timeline, payments and damage charges." },
  }),

  "/dashboard/calendar": {
    id: "dashboard.calendar",
    steps: [
      { target: '[data-tour="page-header"]', title: "Calendar", content: "Appointments, pickups and returns overlaid on one month view — use the arrows to move between months.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "The Month Grid", content: "Color-coded by type — check the legend below the calendar to read it at a glance.", placement: "top" },
    ],
  },

  "/dashboard/appointments": tabTour("dashboard.appointments", {
    header: { title: "Appointments", content: "Fittings, consultations and trials — everything scheduled." },
    action: { title: "New Appointment", content: "Book a fitting or consultation and assign staff or a room." },
    filters: { title: "Search & Filter", content: "Filter by type, status or branch to find what you need fast." },
    content: { title: "The List", content: "Tap an appointment to see full details." },
  }),

  "/dashboard/customers": tabTour("dashboard.customers", {
    header: { title: "Customers", content: "Every bride's profile, in one place." },
    action: { title: "New Customer", content: "Add a customer profile — wedding date, venue, style preferences and all." },
    filters: { title: "Search & Filter", content: "Find a customer by name in seconds." },
    content: { title: "The List", content: "Open a profile to see bookings, measurements, documents and notes." },
  }),

  "/dashboard/garments": tabTour("dashboard.garments", {
    header: { title: "Inventory", content: "Every gown, veil and accessory you own, with its full lifecycle history." },
    action: { title: "Add a Garment", content: "New pieces get a SKU, a QR code, and a status history from day one." },
    filters: { title: "Search & Filter", content: "Filter by category, status or branch, or search by name or SKU." },
    content: { title: "The List", content: "Open a garment to see its condition history, bookings, ROI, and QR code." },
  }),

  "/dashboard/packages": tabTour("dashboard.packages", {
    header: { title: "Packages", content: "Bundled offerings — a gown plus veil plus jewellery, priced as one." },
    action: { title: "New Package", content: "Create a bundle, then add items to it on the next screen." },
    filters: { title: "Search & Filter", content: "Filter by branch or search by name." },
    content: { title: "The List", content: "Toggle a package active or inactive right from this table." },
  }),

  "/dashboard/tailoring": tabTour("dashboard.tailoring", {
    header: { title: "Tailoring", content: "Every alteration job, from assignment to completion." },
    action: { title: "New Job", content: "Assign a job to a tailor — the bride's latest measurements attach automatically." },
    filters: { title: "Search & Filter", content: "Filter by status or assignee." },
    content: { title: "The List", content: "Track progress without needing to ask the tailor directly." },
  }),

  "/dashboard/cleaning": tabTour("dashboard.cleaning", {
    header: { title: "Cleaning", content: "Every cleaning job, from intake to quality check." },
    action: { title: "New Job", content: "Send a garment to cleaning and assign it to your cleaning team." },
    filters: { title: "Search & Filter", content: "Filter by status or assignee." },
    content: { title: "The List", content: "See exactly where each garment is in the cleaning process." },
  }),

  "/dashboard/delivery": tabTour("dashboard.delivery", {
    header: { title: "Delivery & Pickup", content: "Coordinate getting a gown to a bride and back." },
    action: { title: "New Delivery", content: "Assign a driver, a window, and an address." },
    filters: { title: "Search & Filter", content: "Filter by status to see what's still out." },
    content: { title: "The List", content: "Every delivery job and its current status." },
  }),

  "/dashboard/transfers": tabTour("dashboard.transfers", {
    header: { title: "Inventory Transfers", content: "Move a garment from one branch to another, with an approval trail." },
    action: { title: "Request a Transfer", content: "Pick a garment and its destination branch — the Owner approves before it moves." },
    filters: { title: "Filter by Status", content: "See what's requested, approved, in transit, or received." },
    content: { title: "The List", content: "A garment's branchId only actually changes once marked Received." },
  }),

  "/dashboard/payments": {
    id: "dashboard.payments",
    steps: [
      { target: '[data-tour="page-header"]', title: "Payments", content: "Every payment and deposit recorded against a booking.", placement: "bottom" },
      { target: '[data-tour="kpi-today"]', title: "The Big Picture", content: "Total collected and total deposits currently held, at a glance.", placement: "bottom" },
      { target: '[data-tour="page-filters"]', title: "Payments vs. Deposits", content: "Switch tabs above to move between the payment ledger and held deposits.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "The List", content: "Track what's been paid, and what's still outstanding.", placement: "top" },
    ],
  },

  "/dashboard/expenses": tabTour("dashboard.expenses", {
    header: { title: "Expenses", content: "Every cost of running the boutique: rent, salaries, supplies, utilities." },
    action: { title: "Add an Expense", content: "Record money as it goes out, so your profit stays accurate." },
    filters: { title: "Filter by Month", content: "Narrow by category or branch, and step back through earlier months." },
    content: { title: "The List", content: "Edit or delete anything entered by mistake." },
  }),

  "/dashboard/profit-loss": {
    id: "dashboard.profit-loss",
    steps: [
      { target: '[data-tour="page-header"]', title: "Profit & Loss", content: "What came in, what went out, and what was left, month by month.", placement: "bottom" },
      { target: '[data-tour="kpi-today"]', title: "The Bottom Line", content: "Income, expenses, net profit and margin for the selected month.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "Day by Day", content: "Spot the days money went out faster than it came in.", placement: "top" },
      { target: '[data-tour="page-secondary"]', title: "Where It Came From, Where It Went", content: "Income by payment type and expenses by category.", placement: "top" },
    ],
  },

  "/dashboard/reports": {
    id: "dashboard.reports",
    steps: [
      { target: '[data-tour="page-header"]', title: "Reports", content: "Turn rental data into decisions about your inventory.", placement: "bottom" },
      { target: '[data-tour="kpi-today"]', title: "Summary", content: "Total garments, lifetime revenue, average ROI and dead stock, at a glance.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "Top Performers", content: "Your best-earning gowns, ranked by revenue.", placement: "top" },
      { target: '[data-tour="page-secondary"]', title: "Underperforming Inventory", content: "Pieces sitting idle — with a recommendation on what to do about each one.", placement: "top" },
    ],
  },

  "/dashboard/suppliers": tabTour("dashboard.suppliers", {
    header: { title: "Suppliers", content: "Your directory of fabric houses, designers and vendors." },
    action: { title: "Add Supplier", content: "Keep contact details in one place instead of scattered across phones." },
    filters: { title: "Search", content: "Find a supplier by name or contact." },
    content: { title: "The List", content: "Edit or remove a supplier any time." },
  }),

  "/dashboard/staff": tabTour("dashboard.staff", {
    header: { title: "Staff", content: "Everyone who works here, across every role." },
    action: { title: "Add Staff", content: "Create an account with the right role and branch — access is enforced automatically." },
    filters: { title: "Search & Filter", content: "Filter by role or branch to find someone fast." },
    content: { title: "The List", content: "Edit a staff member's role, branch, or active status." },
  }),

  "/dashboard/branches": {
    id: "dashboard.branches",
    steps: [
      {
        target: '[data-tour="page-header"]',
        title: "Branches",
        content: "Dubai, Abu Dhabi, Sharjah — or a future US location. Each one carries its own currency, tax and timezone.",
        placement: "bottom",
      },
      { target: '[data-tour="page-action"]', title: "Opening a New Market", content: "A new branch is just a new row here — no code changes needed.", placement: "left" },
      { target: '[data-tour="page-content"]', title: "The List", content: "Edit a branch to adjust its turnaround-buffer settings.", placement: "top" },
    ],
  },

  "/dashboard/settings": {
    id: "dashboard.settings",
    steps: [
      {
        target: '[data-tour="page-header"]',
        title: "Settings",
        content: "The availability engine's buffer hours and tax configuration live here, per branch. Switch branches with the selector on the right.",
        placement: "bottom",
      },
      {
        target: '[data-tour="page-content"]',
        title: "Buffer Hours & Tax",
        content: "These buffer hours are exactly what the availability engine uses to decide SAFE / TIGHT / UNSAFE on every booking.",
        placement: "top",
      },
    ],
  },

  "/dashboard/audit-log": {
    id: "dashboard.auditLog",
    steps: [
      { target: '[data-tour="page-header"]', title: "Audit Log", content: "A permanent record of who changed what, and when.", placement: "bottom" },
      { target: '[data-tour="page-filters"]', title: "Filter", content: "Narrow down by action type or entity to investigate something specific.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "The Log", content: "Nothing here can be edited or deleted — that's the point.", placement: "top" },
    ],
  },

  "/portal/tailor": {
    id: "portal.tailor",
    steps: [
      { target: '[data-tour="page-header"]', title: "My Tasks", content: "Only the jobs assigned to you — no back-office clutter.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "Overdue, Today, Upcoming", content: "Switch tabs to see what needs attention first.", placement: "top" },
    ],
  },
  "/portal/cleaner": {
    id: "portal.cleaner",
    steps: [
      { target: '[data-tour="page-header"]', title: "My Tasks", content: "Your cleaning queue — nothing else.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "Overdue, Today, Upcoming", content: "One tap moves a job to the next stage.", placement: "top" },
    ],
  },
  "/portal/delivery": {
    id: "portal.delivery",
    steps: [
      { target: '[data-tour="page-header"]', title: "My Deliveries", content: "Everything you're assigned to pick up or deliver today.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "The List", content: "Confirm pickup and delivery right from here.", placement: "top" },
    ],
  },
  "/portal/customer": {
    id: "portal.customer",
    steps: [
      { target: '[data-tour="page-header"]', title: "Welcome", content: "Your bookings, measurements and documents, all in one place.", placement: "bottom" },
      { target: '[data-tour="page-content"]', title: "Your Bookings", content: "Track status and see what's still owed.", placement: "top" },
    ],
  },
};

export function getTourForPath(pathname: string): TourConfig | null {
  return TOURS[pathname] ?? null;
}

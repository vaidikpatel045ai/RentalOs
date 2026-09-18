import {
  CalendarDays,
  Shirt,
  Truck,
  RotateCcw,
  Scissors,
  Sparkles,
  Wallet,
  ShieldCheck,
  Percent,
  TrendingUp,
  Timer,
} from "lucide-react";
import { KpiCard } from "@/components/domain/kpi-card";
import { AtRiskPanel } from "@/components/domain/at-risk-panel";
import { RevenueChart } from "@/components/domain/revenue-chart";
import { getOwnerDashboardData, getAtRiskBookings } from "@/lib/queries/dashboard";
import { formatMoneyCompact } from "@/lib/currency";

export default async function OwnerDashboardPage() {
  const [data, atRisk] = await Promise.all([getOwnerDashboardData(), getAtRiskBookings()]);

  // Owner view spans branches (potentially multiple currencies once the US
  // expansion lands); AED is the display default until per-branch currency
  // rollup is built. See lib/currency.ts.
  const currency = "AED";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl">Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Every garment, every bride, every workflow — at a glance.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Today</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Appointments" value={data.today.appointments} icon={CalendarDays} />
          <KpiCard label="Trials" value={data.today.trials} icon={Shirt} />
          <KpiCard label="Pickups" value={data.today.pickups} icon={Truck} />
          <KpiCard label="Returns" value={data.today.returns} icon={RotateCcw} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Operations</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Alterations Due"
            value={data.alterationsDue}
            icon={Scissors}
            tone={data.alterationsDue > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Cleaning Due"
            value={data.cleaningDue}
            icon={Sparkles}
            tone={data.cleaningDue > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Overdue Returns"
            value={data.overdueReturns}
            icon={RotateCcw}
            tone={data.overdueReturns > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Pending Payments"
            value={formatMoneyCompact(data.pendingPaymentsAmount, currency)}
            icon={Wallet}
            tone={data.pendingPaymentsAmount > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Inventory Position</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Deposits Held" value={formatMoneyCompact(data.depositsHeldAmount, currency)} icon={ShieldCheck} tone="gold" />
          <KpiCard label="Garments Out" value={data.garmentsOut} icon={Truck} />
          <KpiCard label="In Cleaning" value={data.garmentsInCleaning} icon={Sparkles} />
          <KpiCard label="In Tailoring" value={data.garmentsInTailoring} icon={Scissors} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart revenue={data.revenue} currency={currency} />
        </div>
        <AtRiskPanel items={atRisk} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Operational KPIs</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Garment Utilization" value={`${data.kpis.garmentUtilizationPct.toFixed(0)}%`} icon={Percent} />
          <KpiCard label="Booking Rate" value={`${data.kpis.bookingRatePct.toFixed(0)}%`} icon={TrendingUp} />
          <KpiCard label="Avg Rental Value" value={formatMoneyCompact(data.kpis.avgRentalValue, currency)} />
          <KpiCard label="Avg Deposit" value={formatMoneyCompact(data.kpis.avgDeposit, currency)} />
          <KpiCard
            label="Avg Garment ROI"
            value={data.kpis.avgGarmentROI !== null ? `${(data.kpis.avgGarmentROI * 100).toFixed(0)}%` : "—"}
            tone="gold"
          />
          <KpiCard label="Late Return Rate" value={`${data.kpis.lateReturnRatePct.toFixed(0)}%`} />
          <KpiCard label="Damage Rate" value={`${data.kpis.damageRatePct.toFixed(0)}%`} />
          <KpiCard
            label="Cleaning Turnaround"
            value={data.kpis.cleaningTurnaroundHours !== null ? `${data.kpis.cleaningTurnaroundHours.toFixed(1)}h` : "—"}
            icon={Timer}
          />
          <KpiCard
            label="Tailoring Turnaround"
            value={data.kpis.tailoringTurnaroundHours !== null ? `${data.kpis.tailoringTurnaroundHours.toFixed(1)}h` : "—"}
            icon={Timer}
          />
        </div>
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { CalendarDays, Shirt, Truck, RotateCcw, Scissors, Sparkles, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { KpiCard } from "@/components/domain/kpi-card";
import { AtRiskPanel } from "@/components/domain/at-risk-panel";
import { getOwnerDashboardData, getAtRiskBookings } from "@/lib/queries/dashboard";
import { formatMoneyCompact } from "@/lib/currency";

export default async function ManagerDashboardPage() {
  const session = await auth();
  if (!session?.user.branchId) {
    redirect("/login");
  }

  const [branch, data, atRisk] = await Promise.all([
    db.branch.findUnique({ where: { id: session.user.branchId } }),
    getOwnerDashboardData({ branchId: session.user.branchId }),
    getAtRiskBookings({ branchId: session.user.branchId }),
  ]);

  const currency = branch?.currency ?? "AED";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl">{branch?.name} — Branch Operations</h1>
        <p className="text-sm text-muted-foreground">Today&apos;s operational picture for your branch.</p>
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
          <KpiCard label="Alterations Due" value={data.alterationsDue} icon={Scissors} tone={data.alterationsDue > 0 ? "warning" : "default"} />
          <KpiCard label="Cleaning Due" value={data.cleaningDue} icon={Sparkles} tone={data.cleaningDue > 0 ? "warning" : "default"} />
          <KpiCard label="Overdue Returns" value={data.overdueReturns} icon={RotateCcw} tone={data.overdueReturns > 0 ? "danger" : "default"} />
          <KpiCard
            label="Pending Payments"
            value={formatMoneyCompact(data.pendingPaymentsAmount, currency)}
            icon={Wallet}
            tone={data.pendingPaymentsAmount > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <AtRiskPanel items={atRisk} />
    </div>
  );
}

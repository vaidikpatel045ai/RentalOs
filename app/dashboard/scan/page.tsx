import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ScanStation } from "@/components/domain/scan-station";

export default async function ScanPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "bookings", "view")) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div data-tour="page-header">
        <h1 className="font-heading text-2xl">Scan In / Out</h1>
        <p className="text-sm text-muted-foreground">
          Scan a garment&apos;s QR tag to hand it to a customer, or to take it back when it&apos;s returned.
        </p>
      </div>
      <div data-tour="page-content">
        <ScanStation />
      </div>
    </div>
  );
}

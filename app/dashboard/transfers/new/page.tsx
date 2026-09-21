import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferForm } from "@/components/domain/transfer-form";

export default async function NewTransferPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "transfers", "create")) {
    redirect("/dashboard/transfers");
  }

  const [garments, branches] = await Promise.all([
    db.garment.findMany({
      where: { isActive: true },
      include: { branch: true },
      orderBy: { sku: "asc" },
      take: 200,
    }),
    getCachedBranches(),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Request Inventory Transfer</h1>
        <p className="text-sm text-muted-foreground">Moves a garment from its current branch to another. Requires Owner approval.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferForm garments={garments} branches={branches} />
        </CardContent>
      </Card>
    </div>
  );
}

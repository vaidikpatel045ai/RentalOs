import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GarmentForm } from "@/components/domain/garment-form";
import { updateGarment } from "@/lib/actions/garment-actions";

export default async function EditGarmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "garments", "update")) {
    redirect(`/dashboard/garments/${id}`);
  }
  const [garment, branches] = await Promise.all([
    db.garment.findUnique({ where: { id } }),
    getCachedBranches(),
  ]);
  if (!garment) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {garment.sku}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <GarmentForm
            branches={branches}
            action={updateGarment.bind(null, id)}
            defaultValues={{
              sku: garment.sku,
              branchId: garment.branchId,
              name: garment.name,
              category: garment.category,
              designer: garment.designer ?? "",
              collection: garment.collection ?? "",
              brand: garment.brand ?? "",
              size: garment.size ?? "",
              sizeEU: garment.sizeEU ?? "",
              sizeUS: garment.sizeUS ?? "",
              color: garment.color ?? "",
              fabric: garment.fabric ?? "",
              style: garment.style ?? "",
              season: garment.season ?? "",
              year: garment.year ?? undefined,
              rentalPrice: Number(garment.rentalPrice),
              salePrice: garment.salePrice ? Number(garment.salePrice) : undefined,
              securityDeposit: Number(garment.securityDeposit),
              purchaseCost: Number(garment.purchaseCost),
              replacementValue: Number(garment.replacementValue),
              notes: garment.notes ?? "",
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}

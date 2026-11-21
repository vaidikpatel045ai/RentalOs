import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePhotographyPage } from "@/lib/photography-page";
import { reachPhotoShoot } from "@/lib/photography";
import { getShootFormOptions } from "@/lib/queries/photography";
import { updatePhotoShoot } from "@/lib/actions/photography-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoShootForm } from "@/components/domain/photo-shoot-form";

export default async function EditPhotoShootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePhotographyPage("update");
  if (user.role === "PHOTOGRAPHER" || !(await reachPhotoShoot(user, id))) notFound();
  const [shoot, options] = await Promise.all([
    db.photoShoot.findUniqueOrThrow({ where: { id }, include: { customer: true } }),
    getShootFormOptions(user),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {shoot.shootNumber}</h1>
        <p className="text-sm text-muted-foreground">Change the date, place, photographer or price.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoShootForm
            {...options}
            action={updatePhotoShoot.bind(null, shoot.id)}
            submitLabel="Save changes"
            initialCustomer={{ id: shoot.customer.id, firstName: shoot.customer.firstName, lastName: shoot.customer.lastName, phone: shoot.customer.phone }}
            defaultValues={{
              branchId: shoot.branchId,
              customerId: shoot.customerId,
              serviceId: shoot.serviceId ?? "",
              photographerId: shoot.photographerId ?? "",
              type: shoot.type,
              scheduledAt: shoot.scheduledAt,
              durationMinutes: shoot.durationMinutes,
              location: shoot.location ?? "",
              price: Number(shoot.price),
              discount: Number(shoot.discount),
              notes: shoot.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

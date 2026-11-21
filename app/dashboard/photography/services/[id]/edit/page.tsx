import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePhotographyPage } from "@/lib/photography-page";
import { reachPhotoService } from "@/lib/photography";
import { getShootFormOptions } from "@/lib/queries/photography";
import { updatePhotoService } from "@/lib/actions/photography-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoServiceForm } from "@/components/domain/photo-service-form";

export default async function EditPhotoServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePhotographyPage("update");
  if (!(await reachPhotoService(user, id))) notFound();
  const [service, { branches }] = await Promise.all([db.photoService.findUniqueOrThrow({ where: { id } }), getShootFormOptions(user)]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Edit {service.name}</h1>
        <p className="text-sm text-muted-foreground">Price changes apply to new bookings. Existing shoots keep their price.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoServiceForm
            branches={branches}
            action={updatePhotoService.bind(null, service.id)}
            submitLabel="Save changes"
            defaultValues={{
              branchId: service.branchId,
              name: service.name,
              type: service.type,
              description: service.description ?? "",
              deliverables: service.deliverables ?? "",
              price: Number(service.price),
              durationMinutes: service.durationMinutes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

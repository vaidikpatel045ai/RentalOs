import { requirePhotographyPage } from "@/lib/photography-page";
import { getShootFormOptions } from "@/lib/queries/photography";
import { createPhotoService } from "@/lib/actions/photography-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoServiceForm } from "@/components/domain/photo-service-form";

export default async function NewPhotoServicePage() {
  const user = await requirePhotographyPage("create");
  const { branches } = await getShootFormOptions(user);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Add service</h1>
        <p className="text-sm text-muted-foreground">A shoot you offer, with its standard price.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoServiceForm branches={branches} action={createPhotoService} />
        </CardContent>
      </Card>
    </div>
  );
}

import { requirePhotographyPage } from "@/lib/photography-page";
import { getShootFormOptions } from "@/lib/queries/photography";
import { createPhotoShoot } from "@/lib/actions/photography-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoShootForm } from "@/components/domain/photo-shoot-form";

export default async function NewPhotoShootPage() {
  const user = await requirePhotographyPage("create");
  const options = await getShootFormOptions(user);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Book a shoot</h1>
        <p className="text-sm text-muted-foreground">Schedule a photoshoot for a client and assign a photographer.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoShootForm {...options} action={createPhotoShoot} />
        </CardContent>
      </Card>
    </div>
  );
}

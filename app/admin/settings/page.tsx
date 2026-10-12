import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupportContacts } from "@/lib/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportSettingsForm } from "@/components/domain/support/support-settings-form";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (session?.user.role !== "PLATFORM_ADMIN") redirect("/login");
  const contacts = await getSupportContacts();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">How boutiques reach you from their Help &amp; Support page.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Support contact details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Leave a field empty to hide that option. In-app chat always works, whatever you fill in here.
          </p>
        </CardHeader>
        <CardContent>
          <SupportSettingsForm defaults={contacts} />
        </CardContent>
      </Card>
    </div>
  );
}

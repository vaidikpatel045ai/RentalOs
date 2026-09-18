import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentForm } from "@/components/domain/appointment-form";
import { createAppointment } from "@/lib/actions/appointment-actions";

export default async function NewAppointmentPage() {
  const session = await auth();
  const branches = await getCachedBranches();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Appointment</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} action={createAppointment} />
        </CardContent>
      </Card>
    </div>
  );
}

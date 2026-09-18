import { auth } from "@/lib/auth";
import { getCachedBranches } from "@/lib/queries/branches";
import { BookingForm } from "@/components/domain/booking-form";

export default async function NewBookingPage() {
  const session = await auth();
  const branches = await getCachedBranches();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          The availability engine checks turnaround in real time as you pick dates.
        </p>
      </div>
      <BookingForm branches={branches} defaultBranchId={session?.user.branchId ?? undefined} />
    </div>
  );
}

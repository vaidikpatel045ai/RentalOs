import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedBranches } from "@/lib/queries/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchSettingsForm } from "@/components/domain/branch-settings-form";
import { BranchSwitcher } from "@/components/domain/branch-switcher";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const branches = await getCachedBranches();
  const { branchId: branchIdParam } = await searchParams;
  const activeBranchId = branchIdParam ?? branches[0]?.id;
  const branch = branches.find((b) => b.id === activeBranchId);
  if (!branch) {
    return <p className="text-sm text-muted-foreground">No branches yet — create one first.</p>;
  }

  const settings = await db.branchSettings.findUnique({ where: { branchId: branch.id } });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Operational configuration for {branch.name}.</p>
        </div>
        <BranchSwitcher branches={branches} activeBranchId={branch.id} basePath="/dashboard/settings" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Branch Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <BranchSettingsForm
            key={branch.id}
            defaultValues={{
              branchId: branch.id,
              inspectionBufferHours: settings?.inspectionBufferHours ?? 2,
              cleaningBufferHours: settings?.cleaningBufferHours ?? 8,
              repairBufferHours: settings?.repairBufferHours ?? 6,
              qualityCheckBufferHours: settings?.qualityCheckBufferHours ?? 1,
              tightThresholdHours: settings?.tightThresholdHours ?? 24,
              taxRate: Number(branch.taxRate),
              taxLabel: branch.taxLabel,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

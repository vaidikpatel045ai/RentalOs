import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { homeRouteForRole } from "@/lib/permissions";
import { AuthShell } from "@/components/domain/auth-shell";
import { NewPasswordForm } from "@/components/domain/new-password-form";
import { changeOwnPassword } from "@/lib/actions/password-actions";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/change-password");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { mustChangePassword: true } });
  const forced = Boolean(user?.mustChangePassword);

  return (
    <AuthShell
      title={forced ? "Choose your password" : "Change password"}
      description={
        forced
          ? "You signed in with a temporary password. Choose your own to continue."
          : "You'll be signed out on your other devices."
      }
      footer={
        forced ? null : (
          <Link href={homeRouteForRole(session.user.role)} className="underline-offset-4 hover:underline">
            Back to the app
          </Link>
        )
      }
    >
      <NewPasswordForm action={changeOwnPassword} askCurrent submitLabel={forced ? "Save and continue" : "Change password"} />
    </AuthShell>
  );
}

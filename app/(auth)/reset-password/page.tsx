import Link from "next/link";
import { AuthShell } from "@/components/domain/auth-shell";
import { NewPasswordForm } from "@/components/domain/new-password-form";
import { Button } from "@/components/ui/button";
import { resetPasswordWithToken } from "@/lib/actions/password-actions";
import { findUsableResetToken } from "@/lib/password-reset";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const row = await findUsableResetToken(token);

  if (!row) {
    return (
      <AuthShell title="This link has expired" description="Reset links work once and expire after 1 hour.">
        <Button asChild className="w-full">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      description={`For ${row.user.email}. You'll be signed out on any other devices.`}
      footer={
        <Link href="/login" className="underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <NewPasswordForm action={resetPasswordWithToken.bind(null, token)} askCurrent={false} submitLabel="Save new password" />
    </AuthShell>
  );
}

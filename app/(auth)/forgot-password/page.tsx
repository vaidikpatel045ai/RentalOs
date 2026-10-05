import Link from "next/link";
import { AuthShell } from "@/components/domain/auth-shell";
import { ForgotPasswordForm } from "@/components/domain/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter the email you sign in with and we'll send you a link to choose a new one."
      footer={
        <Link href="/login" className="underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type PasswordFormState } from "@/lib/actions/password-actions";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<PasswordFormState, FormData>(requestPasswordReset, {});

  if (state.message) {
    return (
      <div className="flex gap-3 rounded-lg bg-muted/60 p-4 text-sm">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-risk-safe" />
        <p>{state.message} Check your spam folder if you don&apos;t see it.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@boutique.ae" />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

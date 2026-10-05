"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { PasswordFormState } from "@/lib/actions/password-actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-rules";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="text-xs text-destructive">{errors[0]}</p> : null;
}

/** New password + confirm, optionally with the current password first.
 * Used by Change password and by the reset-link page. */
export function NewPasswordForm({
  action,
  askCurrent,
  submitLabel,
}: {
  action: (prev: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  askCurrent: boolean;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {askCurrent && (
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required />
          <FieldError errors={errors.currentPassword} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />
        {errors.password ? (
          <FieldError errors={errors.password} />
        ) : (
          <p className="text-xs text-muted-foreground">At least {PASSWORD_MIN_LENGTH} characters.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
        <FieldError errors={errors.confirmPassword} />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

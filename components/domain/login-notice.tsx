"use client";

import { useSearchParams } from "next/navigation";

const NOTICES: Record<string, string> = {
  reset: "Your password has been changed. Sign in with your new password.",
  ended: "You've been signed out because your password was changed or your account was updated. Please sign in again.",
};

/** One-line notice on the sign-in page after a password reset or an ended session. */
export function LoginNotice() {
  const params = useSearchParams();
  const key = Object.keys(NOTICES).find((k) => params.get(k) === "1");
  if (!key) return null;
  return <p className="mb-4 rounded-lg bg-muted/70 px-3 py-2.5 text-sm">{NOTICES[key]}</p>;
}

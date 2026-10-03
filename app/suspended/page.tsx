import { ShieldAlert } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto size-10 text-risk-unsafe" />
        <h1 className="mt-4 font-heading text-xl">Account not active</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This workspace&apos;s subscription is paused or has expired. Contact the person who manages your
          subscription to restore access.
        </p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

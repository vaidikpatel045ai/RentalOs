"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TemporaryPasswordResult } from "@/lib/actions/password-actions";

type Issued = Extract<TemporaryPasswordResult, { ok: true }>;

/**
 * Confirm, then show a one-time temporary password with copy and WhatsApp
 * buttons. The password is never stored or shown again: closing the dialog
 * forgets it. `reset` is the server action for the caller's context (staff
 * list, or the Platform Admin console for owners).
 */
export function ResetPasswordDialog({
  userName,
  reset,
  label,
}: {
  userName: string;
  reset: () => Promise<TemporaryPasswordResult>;
  /** Shows a labelled button; without it, a small key icon. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setIssued(null);
      setCopied(false);
    }
  }

  function message(p: Issued) {
    return [
      `Hi ${p.name.split(" ")[0]}, your password has been reset.`,
      ``,
      `Email: ${p.email}`,
      `Temporary password: ${p.temporaryPassword}`,
      ...(p.loginUrl ? [`Sign in: ${p.loginUrl}`] : []),
      ``,
      `You'll be asked to choose your own password when you sign in.`,
    ].join("\n");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {label ? (
          <Button variant="outline" size="sm">
            <KeyRound className="size-4" />
            {label}
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" title="Reset password" aria-label={`Reset password for ${userName}`}>
            <KeyRound className="size-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {!issued ? (
          <>
            <DialogHeader>
              <DialogTitle>Reset {userName}&apos;s password?</DialogTitle>
              <DialogDescription>
                They&apos;ll be signed out everywhere and get a temporary password, which they must change when they next
                sign in. Their current password stops working straight away.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await reset();
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    setIssued(result);
                  })
                }
              >
                {isPending ? "Resetting…" : "Reset Password"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Temporary password for {issued.name}</DialogTitle>
              <DialogDescription>Share it with them now. It won&apos;t be shown again once you close this.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <code className="font-mono text-lg tracking-wide select-all">{issued.temporaryPassword}</code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Copy temporary password"
                  onClick={async () => {
                    await navigator.clipboard.writeText(issued.temporaryPassword);
                    setCopied(true);
                    toast.success("Copied");
                  }}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Signs in as {issued.email}</p>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              {issued.phone ? (
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/${issued.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message(issued))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    Send on WhatsApp
                  </a>
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupportTicket, type SupportFormState } from "@/lib/actions/support-actions";

export function NewTicketForm() {
  const [state, formAction, isPending] = useActionState<SupportFormState, FormData>(createSupportTicket, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required maxLength={120} placeholder="e.g. Can't record a payment on BK-2026-0012" />
        {errors.subject?.[0] && <p className="text-xs text-destructive">{errors.subject[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">What do you need help with?</Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="Tell us what happened, what you expected, and which booking, customer or page it's about."
        />
        {errors.message?.[0] && <p className="text-xs text-destructive">{errors.message[0]}</p>}
      </div>
      {state.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        <Send className="size-4" />
        {isPending ? "Sending…" : "Send to Support"}
      </Button>
    </form>
  );
}

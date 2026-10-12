"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSupportSettings, type SupportFormState } from "@/lib/actions/support-actions";

type Defaults = { email: string | null; phone: string | null; whatsapp: string | null; hours: string | null };

const FIELDS: { name: string; label: string; key: keyof Defaults; placeholder: string; hint?: string; type?: string }[] = [
  {
    name: "supportWhatsapp",
    label: "WhatsApp number",
    key: "whatsapp",
    placeholder: "+919876543210",
    hint: "Boutiques tap to start a WhatsApp chat with you.",
  },
  { name: "supportPhone", label: "Phone for calls", key: "phone", placeholder: "+919876543210" },
  {
    name: "supportEmail",
    label: "Support email",
    key: "email",
    placeholder: "support@yourcompany.com",
    hint: "Also where new in-app messages are emailed, once email is set up.",
    type: "email",
  },
  { name: "supportHours", label: "Support hours", key: "hours", placeholder: "Mon–Sat, 10am–7pm IST" },
];

export function SupportSettingsForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction, isPending] = useActionState<SupportFormState, FormData>(updateSupportSettings, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} name={f.name} type={f.type ?? "text"} defaultValue={defaults[f.key] ?? ""} placeholder={f.placeholder} />
          {errors[f.name]?.[0] ? (
            <p className="text-xs text-destructive">{errors[f.name]![0]}</p>
          ) : f.hint ? (
            <p className="text-xs text-muted-foreground">{f.hint}</p>
          ) : null}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {state.ok && <span className="text-sm text-risk-safe">Saved</span>}
        {state.error && !state.fieldErrors && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

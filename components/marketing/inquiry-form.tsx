"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { inquirySchema, BRANCH_COUNT_OPTIONS, type InquiryInput } from "@/lib/validations/inquiry";
import { submitInquiry } from "@/lib/actions/inquiry-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function InquiryForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { website: "" },
  });

  function onSubmit(values: InquiryInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      fd.set(key, String(value));
    });

    startTransition(async () => {
      const result = await submitInquiry({}, fd);
      if (result?.error) {
        form.setError("root", { message: result.error });
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-risk-safe/25 bg-risk-safe/10 px-6 py-14 text-center">
        <CheckCircle2 className="size-8 text-risk-safe" />
        <p className="font-heading text-lg">Request received.</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Someone from our team will reach out within one business day to schedule your demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Boutique name</Label>
          <Input id="businessName" {...form.register("businessName")} />
          {form.formState.errors.businessName && (
            <p className="text-xs text-destructive">{form.formState.errors.businessName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactName">Your name</Label>
          <Input id="contactName" {...form.register("contactName")} />
          {form.formState.errors.contactName && (
            <p className="text-xs text-destructive">{form.formState.errors.contactName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+971501234567" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="Dubai" {...form.register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label>Branches</Label>
          <Select onValueChange={(v) => form.setValue("branchCount", v as InquiryInput["branchCount"])}>
            <SelectTrigger>
              <SelectValue placeholder="How many?" />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_COUNT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">What would help you most right now?</Label>
        <Textarea id="message" rows={3} placeholder="Optional — e.g. we keep double-booking gowns" {...form.register("message")} />
      </div>

      {/* Honeypot — real visitors never see or fill this in. */}
      <div className="sr-only" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input id="website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>

      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
        {isPending ? "Sending…" : "Request a demo"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { authenticate, type LoginState } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(authenticate, initialState);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-1">
            <span className="font-heading text-2xl tracking-tight">Bridal Rental OS</span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Boutique Operations
            </span>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card px-8 py-9 shadow-sm">
          <h1 className="font-heading text-xl">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your workspace credentials to continue.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@boutique.ae"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Every garment. Every bride. Every workflow. One system.
        </p>
      </div>
    </div>
  );
}

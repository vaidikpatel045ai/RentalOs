"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SupportFormState } from "@/lib/actions/support-actions";
import { cn } from "@/lib/utils";

export interface ThreadMessage {
  id: string;
  body: string;
  fromPlatform: boolean;
  authorName: string;
  createdAt: string;
}

/** How often an open conversation checks for new messages. */
const REFRESH_MS = 5000;

/**
 * A support conversation: messages, newest at the bottom, and a reply box.
 * `side` is who's looking, so their own messages sit on the right. While the
 * tab is visible it re-fetches every few seconds, so replies show up live.
 */
export function SupportThread({
  messages,
  side,
  action,
  placeholder,
}: {
  messages: ThreadMessage[];
  side: "platform" | "boutique";
  action: (prev: SupportFormState, formData: FormData) => Promise<SupportFormState>;
  placeholder: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
        {messages.map((m) => {
          const mine = (side === "platform") === m.fromPlatform;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%]",
                  mine ? "rounded-br-sm bg-foreground text-background" : "rounded-bl-sm border border-border bg-card"
                )}
              >
                <p className={cn("mb-0.5 text-xs", mine ? "text-background/70" : "text-muted-foreground")}>
                  {m.authorName} ·{" "}
                  {new Date(m.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form ref={formRef} action={formAction} className="space-y-2">
        <Textarea
          name="message"
          rows={3}
          required
          placeholder={placeholder}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter sends; plain Enter makes a new line.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {state.error ? <span className="text-destructive">{state.error}</span> : "Ctrl + Enter to send"}
          </p>
          <Button type="submit" disabled={isPending}>
            <Send className="size-4" />
            {isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}

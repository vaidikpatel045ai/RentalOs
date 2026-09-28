"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tours/types";

interface TourOverlayProps {
  steps: TourStep[];
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;
const CARD_WIDTH = 320;

export function TourOverlay({ steps, stepIndex, onNext, onBack, onClose }: TourOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[stepIndex];

  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      // Target vanished (or was never there for this viewer) — move on
      // rather than stall the tour on a highlight nobody can see.
      onNext();
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    function update() {
      const r = (el as Element).getBoundingClientRect();
      setRect({ top: r.top - PADDING, left: r.left - PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 });
    }
    update();
    const t = setTimeout(update, 300); // after scrollIntoView settles

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft") onBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onBack, onClose]);

  if (typeof document === "undefined" || !step || !rect) return null;

  const cardTop = pickCardTop(rect, step.placement);
  const cardLeft = clamp(rect.left, 12, window.innerWidth - CARD_WIDTH - 12);

  return createPortal(
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Click-catcher so the tour blocks interaction with the rest of the page. */}
      <button type="button" aria-label="Close tour" className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Spotlight: a transparent box whose oversized box-shadow dims everything else. */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-gold transition-all duration-200"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: "0 0 0 9999px rgba(15, 15, 15, 0.65)",
        }}
      />

      <div
        className="absolute w-80 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl"
        style={{ top: cardTop, left: cardLeft }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading text-sm">{step.title}</p>
          <button type="button" onClick={onClose} aria-label="Close tour" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.content}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button size="sm" variant="ghost" onClick={onBack}>
                Back
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Skip
            </Button>
            <Button size="sm" onClick={onNext}>
              {stepIndex === steps.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function pickCardTop(rect: Rect, placement: TourStep["placement"]): number {
  const CARD_HEIGHT_ESTIMATE = 150;
  if (placement === "top") return clamp(rect.top - CARD_HEIGHT_ESTIMATE - 12, 12, window.innerHeight - CARD_HEIGHT_ESTIMATE - 12);
  // Default to "bottom" for bottom/left/right — vertical stacking under the
  // target reads fine at every viewport width, which matters more here than
  // matching the requested side exactly.
  return clamp(rect.top + rect.height + 12, 12, window.innerHeight - CARD_HEIGHT_ESTIMATE - 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

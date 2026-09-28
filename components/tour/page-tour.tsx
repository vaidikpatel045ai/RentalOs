"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { getTourForPath } from "@/lib/tours/registry";

function seenKey(tourId: string) {
  return `tour-seen:${tourId}`;
}

export function PageTour() {
  const pathname = usePathname();
  // Remounting on navigation (rather than resetting state in an effect)
  // gives every page a clean running=false/stepIndex=0 start for free.
  return <PageTourForPath key={pathname} pathname={pathname} />;
}

function PageTourForPath({ pathname }: { pathname: string }) {
  const config = getTourForPath(pathname);
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Auto-start once per tour, ever (per browser) — never on a page the
  // viewer has already been shown. A short delay lets the page's own data
  // finish rendering so the first target actually exists to highlight.
  useEffect(() => {
    if (!config) return;
    let seen = true;
    try {
      seen = localStorage.getItem(seenKey(config.id)) === "1";
    } catch {
      // Private browsing / blocked storage — treat as already seen rather
      // than auto-popping a tour with no way to remember it was dismissed.
    }
    if (seen) return;
    const t = setTimeout(() => setRunning(true), 500);
    return () => clearTimeout(t);
    // Runs once per mount — this component remounts on every path change
    // (keyed by pathname in PageTour above), so there's no dependency to track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markSeen() {
    if (!config) return;
    try {
      localStorage.setItem(seenKey(config.id), "1");
    } catch {
      // Ignore — worst case the tour auto-offers again next visit.
    }
  }

  function handleNext() {
    if (!config) return;
    setStepIndex((i) => {
      if (i + 1 >= config.steps.length) {
        setRunning(false);
        markSeen();
        return i;
      }
      return i + 1;
    });
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleClose() {
    setRunning(false);
    markSeen();
  }

  if (!config) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Take a tour of this page"
        onClick={() => {
          setStepIndex(0);
          setRunning(true);
        }}
      >
        <HelpCircle className="size-5" />
      </Button>
      {running && (
        <TourOverlay steps={config.steps} stepIndex={stepIndex} onNext={handleNext} onBack={handleBack} onClose={handleClose} />
      )}
    </>
  );
}

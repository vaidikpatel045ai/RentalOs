"use client";

import { useRef, useState } from "react";
import { Download, Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/**
 * Opens a booking's invoice in a large popup on the same screen. The PDF
 * comes from the signed-in invoice route, which creates the invoice on
 * first use; the iframe isn't mounted until the popup opens.
 */
export function InvoicePreviewDialog({
  bookingId,
  bookingNumber,
  label,
}: {
  bookingId: string;
  bookingNumber: string;
  /** Shows a labelled outline button; without it, a small eye icon. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const url = `/api/bookings/${bookingId}/invoice`;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setLoaded(false);
          setOpen(next);
        }}
      >
        <DialogTrigger asChild>
          {label ? (
            <Button variant="outline" size="sm">
              <Eye className="size-4" />
              {label}
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" title="View invoice" aria-label={`View invoice for ${bookingNumber}`}>
              <Eye className="size-3.5" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="flex h-[92vh] max-w-[calc(100%-2rem)] flex-col gap-3 p-4 sm:max-w-5xl sm:p-5">
          <DialogHeader className="flex-row flex-wrap items-center justify-between gap-3 pr-8 text-left">
            <div>
              <DialogTitle className="font-heading">Invoice for {bookingNumber}</DialogTitle>
              <DialogDescription className="sr-only">Preview of the invoice PDF</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!loaded}
                onClick={() => {
                  frameRef.current?.contentWindow?.focus();
                  frameRef.current?.contentWindow?.print();
                }}
              >
                <Printer className="size-4" />
                Print
              </Button>
              <Button asChild size="sm">
                <a href={`${url}?download=1`} download>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            </div>
          </DialogHeader>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted">
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Preparing invoice…
              </div>
            )}
            {open && (
              <iframe
                ref={frameRef}
                // Hide the viewer's thumbnail panel and fit the page to the popup width.
                src={`${url}#navpanes=0&view=FitH`}
                title={`Invoice for ${bookingNumber}`}
                className="size-full"
                onLoad={() => setLoaded(true)}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:hidden">
            Preview not showing on your phone?{" "}
            <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Open the PDF
            </a>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

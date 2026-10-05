"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, Mail, MessageCircle, Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { emailInvoice, prepareInvoice } from "@/lib/actions/invoice-actions";
import { InvoicePreviewDialog } from "@/components/domain/invoice-preview-dialog";

type Busy = "download" | "print" | "whatsapp" | "email" | null;

/** Prints a same-origin PDF through a hidden iframe; opens it in a tab if the
 * browser won't print an embedded PDF (Safari, some mobile browsers). */
function printPdf(url: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank");
    }
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

export function InvoiceActions({
  bookingId,
  bookingNumber,
  customerEmail,
  hasPhone,
  emailEnabled,
  canSend,
}: {
  bookingId: string;
  bookingNumber: string;
  customerEmail: string | null;
  hasPhone: boolean;
  emailEnabled: boolean;
  canSend: boolean;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [, startTransition] = useTransition();

  function run(kind: Exclude<Busy, null>, task: () => Promise<void>) {
    setBusy(kind);
    startTransition(async () => {
      try {
        await task();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setBusy(null);
      }
    });
  }

  function onDownload() {
    run("download", async () => {
      const result = await prepareInvoice(bookingId, "download");
      if (!result.ok) return void toast.error(result.error);
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `${result.invoiceNumber}.pdf`;
      link.click();
    });
  }

  function onPrint() {
    run("print", async () => {
      const result = await prepareInvoice(bookingId, "print");
      if (!result.ok) return void toast.error(result.error);
      printPdf(result.viewUrl);
    });
  }

  function onWhatsapp() {
    // Open the tab during the click itself, or popup blockers stop it once we've awaited the server.
    const tab = window.open("about:blank", "_blank");
    run("whatsapp", async () => {
      const result = await prepareInvoice(bookingId, "whatsapp");
      if (!result.ok || !result.whatsappUrl) {
        tab?.close();
        return void toast.error(result.ok ? "This customer has no phone number." : result.error);
      }
      if (tab) tab.location.href = result.whatsappUrl;
      else window.location.href = result.whatsappUrl;
      toast.success(`WhatsApp opened with invoice ${result.invoiceNumber}. Tap send there.`);
    });
  }

  function onEmail() {
    run("email", async () => {
      const result = await emailInvoice(bookingId);
      if (!result.ok) return void toast.error(result.error);
      setEmailOpen(false);
      toast.success(`Invoice emailed to ${result.to}`);
    });
  }

  const emailHint = !emailEnabled ? "Email isn't set up yet" : !customerEmail ? "No email on file" : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <InvoicePreviewDialog bookingId={bookingId} bookingNumber={bookingNumber} label="View" />
        <Button variant="outline" size="sm" onClick={onDownload} disabled={busy !== null}>
          <Download className="size-4" />
          {busy === "download" ? "Preparing…" : "Download"}
        </Button>
        <Button variant="outline" size="sm" onClick={onPrint} disabled={busy !== null}>
          <Printer className="size-4" />
          {busy === "print" ? "Preparing…" : "Print"}
        </Button>
        {canSend && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={busy !== null}>
                <Send className="size-4" />
                {busy === "whatsapp" || busy === "email" ? "Sending…" : "Send to Customer"}
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={onWhatsapp} disabled={!hasPhone}>
                <MessageCircle className="size-4" />
                <div className="flex flex-col">
                  <span>WhatsApp</span>
                  {!hasPhone && <span className="text-xs text-muted-foreground">No phone number on file</span>}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEmailOpen(true)} disabled={emailHint !== null}>
                <Mail className="size-4" />
                <div className="flex flex-col">
                  <span>Email</span>
                  <span className="text-xs text-muted-foreground">{emailHint ?? customerEmail}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email the invoice?</DialogTitle>
            <DialogDescription>
              The latest invoice will be sent to {customerEmail} with the PDF attached.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)} disabled={busy === "email"}>
              Cancel
            </Button>
            <Button onClick={onEmail} disabled={busy === "email"}>
              {busy === "email" ? "Sending…" : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

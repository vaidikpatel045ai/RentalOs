"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { uploadDocument, deleteDocument } from "@/lib/actions/document-actions";
import { DOCUMENT_TYPES } from "@/lib/validations/document";
import { enumLabel } from "@/lib/format-enum";
import type { Document } from "@prisma/client";

interface DocumentsListProps {
  documents: Document[];
  linkTo: { customerId?: string; bookingId?: string; garmentId?: string };
  canManage: boolean;
  revalidatePathTarget: string;
}

export function DocumentsList({ documents, linkTo, canManage, revalidatePathTarget }: DocumentsListProps) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("CONTRACT");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onUpload(formData: FormData) {
    formData.set("type", docType);
    startTransition(async () => {
      const result = await uploadDocument({}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Document uploaded");
      setOpen(false);
      formRef.current?.reset();
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id, revalidatePathTarget);
        toast.success("Document removed");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove document");
      }
    });
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="size-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload a Document</DialogTitle>
            </DialogHeader>
            <form ref={formRef} action={onUpload} className="space-y-4">
              {linkTo.customerId && <input type="hidden" name="customerId" value={linkTo.customerId} />}
              {linkTo.bookingId && <input type="hidden" name="bookingId" value={linkTo.bookingId} />}
              {linkTo.garmentId && <input type="hidden" name="garmentId" value={linkTo.garmentId} />}
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {enumLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">File</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Uploading…" : "Upload"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 hover:underline"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{doc.fileName}</span>
              </a>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {enumLabel(doc.type)}
                </Badge>
                <span className="hidden text-xs text-muted-foreground sm:inline">{format(doc.createdAt, "d MMM yyyy")}</span>
                {canManage && (
                  <Button variant="ghost" size="icon-xs" disabled={isPending} onClick={() => onDelete(doc.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { addTailoringNote } from "@/lib/actions/job-actions";

export function AddJobNoteDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setNote("");
    setFiles([]);
  }

  function submit() {
    const fd = new FormData();
    fd.set("note", note);
    files.forEach((f) => fd.append("photos", f));
    startTransition(async () => {
      const result = await addTailoringNote(jobId, fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Update added");
        setOpen(false);
        reset();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquarePlus className="size-4" /> Add Update
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Progress Update</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="e.g. Hem taken in, bust adjusted. Ready for second fitting."
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length > 0) setFiles((prev) => [...prev, ...picked]);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Camera className="size-4" /> Attach Photo
            </Button>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                    {f.name.length > 18 ? `${f.name.slice(0, 15)}…` : f.name}
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending || (!note.trim() && files.length === 0)}>
            {isPending ? "Saving…" : "Save Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

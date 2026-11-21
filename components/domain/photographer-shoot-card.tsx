import { Clock, MapPin, Phone, ExternalLink } from "lucide-react";
import type { PhotoShootStatus } from "@prisma/client";
import { enumLabel } from "@/lib/format-enum";
import { PhotoShootStatusBadge } from "@/components/domain/status-badge";
import { ShootDeliveryForm, ShootStatusActions } from "@/components/domain/photo-shoot-controls";
import { zonedShortDateTime } from "@/lib/datetime";

export interface PhotographerShootCardData {
  id: string;
  shootNumber: string;
  status: PhotoShootStatus;
  type: string;
  serviceName: string | null;
  deliverables: string | null;
  scheduledAt: Date;
  timezone: string;
  durationMinutes: number;
  location: string | null;
  notes: string | null;
  galleryUrl: string | null;
  photographerNotes: string | null;
  client: { name: string; phone: string; whatsapp: string | null };
}

/** One shoot as the photographer sees it: when, where, who, and what to do next. No prices. */
export function PhotographerShootCard({ shoot }: { shoot: PhotographerShootCardData }) {
  const done = shoot.status === "DELIVERED" || shoot.status === "CANCELLED";
  const phone = shoot.client.whatsapp || shoot.client.phone;

  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{shoot.shootNumber}</p>
          <h3 className="font-heading text-lg leading-tight">{shoot.serviceName ?? enumLabel(shoot.type)}</h3>
          <p className="text-sm text-muted-foreground">{shoot.client.name}</p>
        </div>
        <PhotoShootStatusBadge status={shoot.status} />
      </header>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <dt className="sr-only">When</dt>
          <dd>
            {zonedShortDateTime(shoot.scheduledAt, shoot.timezone)} · {shoot.durationMinutes} min
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <dt className="sr-only">Where</dt>
          <dd className="min-w-0 break-words">
            {shoot.location ? (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shoot.location)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {shoot.location}
              </a>
            ) : (
              <span className="text-muted-foreground">Location not set yet</span>
            )}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-muted-foreground" />
          <dt className="sr-only">Client phone</dt>
          <dd className="flex flex-wrap items-center gap-x-3">
            <a href={`tel:${shoot.client.phone}`} className="tabular-nums hover:underline">
              {shoot.client.phone}
            </a>
            {phone && (
              <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
                WhatsApp
              </a>
            )}
          </dd>
        </div>
      </dl>

      {(shoot.deliverables || shoot.notes) && (
        <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          {shoot.deliverables && (
            <p>
              <span className="text-muted-foreground">Deliver: </span>
              {shoot.deliverables}
            </p>
          )}
          {shoot.notes && <p className="whitespace-pre-line">{shoot.notes}</p>}
        </div>
      )}

      {shoot.status === "REQUESTED" && (
        <p className="text-sm text-muted-foreground">The boutique hasn&apos;t confirmed this shoot with the client yet.</p>
      )}

      {shoot.status === "DELIVERED" && shoot.galleryUrl && (
        <a href={shoot.galleryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          Gallery <ExternalLink className="size-3.5" />
        </a>
      )}

      {!done && shoot.status !== "REQUESTED" && (
        <div className="space-y-4 border-t border-border pt-4">
          <ShootStatusActions shootId={shoot.id} status={shoot.status} canCancel={false} photographerView hasGallery={Boolean(shoot.galleryUrl)} />
          {(shoot.status === "SHOT" || shoot.status === "EDITING") && (
            <ShootDeliveryForm shootId={shoot.id} galleryUrl={shoot.galleryUrl} photographerNotes={shoot.photographerNotes} />
          )}
        </div>
      )}
    </article>
  );
}

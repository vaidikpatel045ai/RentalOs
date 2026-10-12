import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { phoneDigits } from "@/lib/support";

type Contacts = { email: string | null; phone: string | null; whatsapp: string | null; hours: string | null };

function Option({
  href,
  icon,
  title,
  detail,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-accent"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </a>
  );
}

/** WhatsApp, call and email buttons for the platform team, from Platform Admin settings. */
export function ContactOptions({ contacts, boutiqueName }: { contacts: Contacts; boutiqueName: string }) {
  const greeting = `Hi, this is ${boutiqueName} using Bridal Rental OS. I need help with: `;
  const options = [
    contacts.whatsapp && (
      <Option
        key="wa"
        href={`https://wa.me/${phoneDigits(contacts.whatsapp).replace("+", "")}?text=${encodeURIComponent(greeting)}`}
        external
        icon={<MessageCircle className="size-5" />}
        title="Chat on WhatsApp"
        detail={contacts.whatsapp}
      />
    ),
    contacts.phone && (
      <Option key="tel" href={`tel:${phoneDigits(contacts.phone)}`} icon={<Phone className="size-5" />} title="Call us" detail={contacts.phone} />
    ),
    contacts.email && (
      <Option
        key="mail"
        href={`mailto:${contacts.email}?subject=${encodeURIComponent(`Support request from ${boutiqueName}`)}`}
        icon={<Mail className="size-5" />}
        title="Email us"
        detail={contacts.email}
      />
    ),
  ].filter(Boolean);

  if (options.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">{options}</div>
      {contacts.hours && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> Support hours: {contacts.hours}
        </p>
      )}
    </div>
  );
}

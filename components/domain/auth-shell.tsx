import Link from "next/link";

/** The centered card used by the sign-in and password pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/login" className="inline-flex flex-col items-center gap-1">
            <span className="font-heading text-2xl tracking-tight">Bridal Rental OS</span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Boutique Operations</span>
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8 sm:py-9">
          <h1 className="font-heading text-xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}

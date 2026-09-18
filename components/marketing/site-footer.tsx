import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div>
          <p className="font-heading text-sm">Bridal Rental OS</p>
          <p className="mt-1 text-xs text-muted-foreground">From fitting to return. Everything connected.</p>
        </div>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

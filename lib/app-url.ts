/**
 * The site's public address for links sent by email (password resets).
 * Never built from the request's Host header: anyone can forge that, and a
 * reset link pointing at their domain would hand them the reset token.
 * Order: APP_URL, then NEXT_PUBLIC_APP_URL (ignored in production if it still
 * says localhost), then Vercel's production domain. Null if none is usable.
 */
export function trustedAppUrl(): string | null {
  const isProd = process.env.NODE_ENV === "production";
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (isProd && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) continue;
      return url.origin;
    } catch {
      // Not a URL; try the next one.
    }
  }
  return null;
}

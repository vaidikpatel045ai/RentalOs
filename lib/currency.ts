/**
 * Single source of truth for money formatting across the app.
 *
 * The business is UAE-first today but plans to expand to the USA, so
 * currency is always read from the branch/booking record, never hardcoded.
 * Every screen that displays a price MUST go through `formatMoney` instead
 * of building its own `Intl.NumberFormat` or concatenating a symbol string.
 */

export type MoneyInput = number | string | { toString(): string };

function toNumber(value: MoneyInput): number {
  if (typeof value === "number") return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formats an amount using the given ISO 4217 currency code.
 * Falls back gracefully if the runtime doesn't recognize the currency.
 */
export function formatMoney(
  amount: MoneyInput,
  currency: string = "AED",
  locale: string = "en-AE"
): string {
  const value = toNumber(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Compact form for dashboard KPI cards, e.g. "AED 276K". */
export function formatMoneyCompact(
  amount: MoneyInput,
  currency: string = "AED",
  locale: string = "en-AE"
): string {
  const value = toNumber(amount);
  try {
    const compact = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
    return `${currency} ${compact}`;
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

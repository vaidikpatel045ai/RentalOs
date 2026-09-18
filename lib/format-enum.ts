/** "BRIDAL_GOWN" -> "Bridal Gown". Shared by every enum-driven filter/badge label. */
export function enumLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function enumOptions<T extends string>(values: readonly T[]): { value: T; label: string }[] {
  return values.map((v) => ({ value: v, label: enumLabel(v) }));
}

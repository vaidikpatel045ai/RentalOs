import type { CustomerMeasurement } from "@prisma/client";

/** Body-measurement fields captured on CustomerMeasurement, in display order. */
export const MEASUREMENT_FIELDS = [
  "bust",
  "underbust",
  "waist",
  "hip",
  "shoulder",
  "armhole",
  "sleeve",
  "bicep",
  "blouseLength",
  "frontLength",
  "backLength",
  "hollowToHem",
  "height",
  "heelHeight",
  "lehengaWaist",
  "lehengaLength",
  "trainLength",
] as const;

export const MEASUREMENT_LABELS: Record<(typeof MEASUREMENT_FIELDS)[number], string> = {
  bust: "Bust",
  underbust: "Underbust",
  waist: "Waist",
  hip: "Hip",
  shoulder: "Shoulder",
  armhole: "Armhole",
  sleeve: "Sleeve",
  bicep: "Bicep",
  blouseLength: "Blouse Length",
  frontLength: "Front Length",
  backLength: "Back Length",
  hollowToHem: "Hollow to Hem",
  height: "Height",
  heelHeight: "Heel Height",
  lehengaWaist: "Lehenga Waist",
  lehengaLength: "Lehenga Length",
  trainLength: "Train Length",
};

export interface MeasurementSnapshot {
  version: number;
  unit: string;
  takenAt: string;
  verified: boolean;
  values: Partial<Record<(typeof MEASUREMENT_FIELDS)[number], number>>;
}

/**
 * Converts a CustomerMeasurement row into a plain JSON-safe snapshot (Prisma
 * Decimal fields aren't directly storable in a Json column). Used to freeze
 * the bride's measurements onto a TailoringJob at the moment it's assigned —
 * a snapshot, not a live reference, so a later re-measurement never silently
 * rewrites the instructions a tailor already started cutting to.
 */
export function snapshotMeasurement(m: CustomerMeasurement): MeasurementSnapshot {
  const values: MeasurementSnapshot["values"] = {};
  for (const field of MEASUREMENT_FIELDS) {
    const raw = m[field];
    if (raw !== null && raw !== undefined) {
      values[field] = Number(raw);
    }
  }
  return {
    version: m.version,
    unit: m.unit,
    takenAt: m.takenAt.toISOString(),
    verified: m.verified,
    values,
  };
}

export function isMeasurementSnapshot(value: unknown): value is MeasurementSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "values" in value &&
    typeof (value as MeasurementSnapshot).values === "object"
  );
}

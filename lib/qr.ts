import QRCode from "qrcode";

/** Deep-link value encoded into a garment's QR/barcode (spec section 32). */
export function garmentQrValue(sku: string): string {
  return `garment:${sku}`;
}

export function garmentDeepLink(appUrl: string, garmentId: string): string {
  return `${appUrl.replace(/\/$/, "")}/dashboard/garments/${garmentId}`;
}

export async function generateQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, { margin: 1, width: 240, color: { dark: "#241f16", light: "#00000000" } });
}

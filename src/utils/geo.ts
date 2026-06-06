import type { LatLng } from "@/types";

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Khoảng cách great-circle giữa 2 điểm (km), dùng công thức Haversine.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Format khoảng cách cho UI: < 1 km hiển thị mét, ngược lại hiển thị km.
 */
export function formatKm(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1) {
    const meters = Math.round(value * 1000);
    return `${meters} m`;
  }
  if (value < 10) return `${value.toFixed(1)} km`;
  return `${Math.round(value)} km`;
}

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Wrap longitude vào khoảng [-180, 180) */
const wrapLng = (lng: number): number => {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped;
};

/**
 * Clamp lat về [-90, 90] và wrap lng về [-180, 180).
 */
export function clampLatLng(value: LatLng): LatLng {
  return {
    lat: clampNumber(value.lat, -90, 90),
    lng: wrapLng(value.lng),
  };
}

/** Type guard: kiểm tra value có phải LatLng hợp lệ không */
export function isLatLng(value: unknown): value is LatLng {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lat === "number" &&
    Number.isFinite(v.lat) &&
    typeof v.lng === "number" &&
    Number.isFinite(v.lng)
  );
}

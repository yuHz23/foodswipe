import type { FoodPlace } from "@/types";

/**
 * Link Google Maps trỏ ĐÚNG toạ độ của quán (chính xác vị trí trên bản đồ).
 * Dùng toạ độ làm chính; kèm tên để Google hiển thị nhãn đúng địa điểm.
 */
export function googleMapsUrl(place: FoodPlace): string {
  const { lat, lng } = place.location;
  // Toạ độ chính xác → thả ghim đúng chỗ. Kèm tên để Google nhận diện địa điểm.
  const query = place.name
    ? encodeURIComponent(`${place.name}, ${lat},${lng}`)
    : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Link chỉ đường tới quán (Google Maps Directions) */
export function googleDirectionsUrl(place: FoodPlace): string {
  const { lat, lng } = place.location;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Mở Google Maps ở tab mới (an toàn noopener) */
export function openInGoogleMaps(place: FoodPlace): void {
  window.open(googleMapsUrl(place), "_blank", "noopener,noreferrer");
}

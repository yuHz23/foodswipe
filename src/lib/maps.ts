import type { FoodPlace } from "@/types";

/**
 * Tạo link Google Maps trỏ đúng quán: ưu tiên tìm theo tên + địa chỉ
 * (để mở đúng địa điểm có ảnh/review thật của Google), fallback toạ độ.
 */
export function googleMapsUrl(place: FoodPlace): string {
  const hasAddress =
    place.address && !place.address.startsWith("Địa chỉ chưa");

  let query: string;
  if (place.name && hasAddress) {
    query = encodeURIComponent(`${place.name}, ${place.address}`);
  } else if (place.name) {
    // Kèm toạ độ để Google ưu tiên đúng khu vực
    query = encodeURIComponent(
      `${place.name} ${place.location.lat},${place.location.lng}`,
    );
  } else {
    query = `${place.location.lat},${place.location.lng}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Mở Google Maps ở tab mới (an toàn noopener) */
export function openInGoogleMaps(place: FoodPlace): void {
  window.open(googleMapsUrl(place), "_blank", "noopener,noreferrer");
}

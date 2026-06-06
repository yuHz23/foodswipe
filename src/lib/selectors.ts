import type {
  FoodPlace,
  LatLng,
  RankedPlace,
  SortMode,
  UserPrefs,
} from "@/types";
import { haversineKm } from "@/utils/geo";

/** Gắn distanceKm vào mỗi place dựa trên vị trí người dùng */
export function withDistance(
  places: FoodPlace[],
  origin: LatLng,
): RankedPlace[] {
  return places.map((p) => ({
    ...p,
    distanceKm: haversineKm(origin, p.location),
  }));
}

const sortComparators: Record<
  SortMode,
  (a: RankedPlace, b: RankedPlace) => number
> = {
  distance: (a, b) => a.distanceKm - b.distanceKm,
  rating: (a, b) =>
    (b.rating ?? 0) - (a.rating ?? 0) || a.distanceKm - b.distanceKm,
  price: (a, b) =>
    (a.priceLevel ?? 99) - (b.priceLevel ?? 99) || a.distanceKm - b.distanceKm,
};

export function sortPlaces(
  places: RankedPlace[],
  mode: SortMode,
): RankedPlace[] {
  return [...places].sort(sortComparators[mode]);
}

type DeckParams = {
  places: FoodPlace[];
  origin: LatLng;
  prefs: UserPrefs;
  likedIds: string[];
  hiddenIds: string[];
};

/**
 * Xây deck để lướt: tính khoảng cách → lọc bán kính/tag/giá →
 * loại đã thích & đã bỏ qua → sắp xếp.
 */
export function buildDeck({
  places,
  origin,
  prefs,
  likedIds,
  hiddenIds,
}: DeckParams): RankedPlace[] {
  const seen = new Set([...likedIds, ...hiddenIds]);
  const ranked = withDistance(places, origin).filter((p) => {
    if (seen.has(p.id)) return false;
    if (p.distanceKm > prefs.radiusKm) return false;
    // Chỉ lọc giá khi quán có dữ liệu giá
    if (p.priceLevel !== null && p.priceLevel > prefs.maxPrice) return false;
    // Đang mở: ẩn quán biết chắc đã đóng (giữ quán chưa rõ giờ)
    if (prefs.openNowOnly && p.openNow === false) return false;
    if (
      prefs.activeTags.length > 0 &&
      !prefs.activeTags.some((tag) => p.tags.includes(tag))
    ) {
      return false;
    }
    return true;
  });
  return sortPlaces(ranked, prefs.sortMode);
}

/** Số quán nằm trong bán kính (bỏ qua filter tag/giá/lịch sử) — cho UI thống kê */
export function countWithinRadius(
  places: FoodPlace[],
  origin: LatLng,
  radiusKm: number,
): number {
  return withDistance(places, origin).filter((p) => p.distanceKm <= radiusKm)
    .length;
}

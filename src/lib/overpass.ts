import type { FoodPlace, LatLng } from "@/types";
import { osmRealImage, pickFoodPhoto } from "@/lib/foodPhotos";

/**
 * Lấy quán ăn thật quanh một vị trí từ OpenStreetMap qua Overpass API.
 * Miễn phí, không cần API key. Có mirror dự phòng nếu endpoint chính lỗi.
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements: OverpassElement[] };

const AMENITY_RE =
  "^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|bakery)$";

/** Map giá trị cuisine của OSM → tag tiếng Việt để hợp với bộ lọc */
function mapTags(tags: Record<string, string>): string[] {
  const out = new Set<string>();
  const cuisine = (tags.cuisine ?? "").toLowerCase();
  const amenity = (tags.amenity ?? "").toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => cuisine.includes(k));

  if (has("pho", "noodle", "vietnamese") || tags["cuisine:pho"]) out.add("Phở");
  if (has("noodle", "bun")) out.add("Bún");
  if (has("rice", "com")) out.add("Cơm");
  if (has("hotpot", "hot_pot", "lau")) out.add("Lẩu");
  if (has("bbq", "barbecue", "grill", "korean", "nuong")) out.add("Nướng");
  if (has("coffee", "cafe") || amenity === "cafe") out.add("Cà phê");
  if (has("bubble_tea", "tea", "milk_tea")) out.add("Trà sữa");
  if (has("seafood", "fish")) out.add("Hải sản");
  if (has("vegetarian", "vegan")) out.add("Chay");
  if (has("pizza", "italian")) out.add("Pizza");
  if (
    has("cake", "dessert", "ice_cream", "bakery", "donut") ||
    amenity === "bakery" ||
    amenity === "ice_cream"
  )
    out.add("Bánh");
  if (amenity === "fast_food" || has("burger", "sandwich", "snack"))
    out.add("Ăn vặt");

  // Nếu không map được, dùng nhãn theo amenity
  if (out.size === 0) {
    const fallback: Record<string, string> = {
      restaurant: "Nhà hàng",
      cafe: "Cà phê",
      fast_food: "Ăn vặt",
      food_court: "Ẩm thực",
      bar: "Quán bar",
      pub: "Quán nhậu",
    };
    out.add(fallback[amenity] ?? "Quán ăn");
  }
  return [...out];
}

const AMENITY_VI: Record<string, string> = {
  restaurant: "Nhà hàng",
  cafe: "Quán cà phê",
  fast_food: "Đồ ăn nhanh",
  food_court: "Khu ẩm thực",
  ice_cream: "Kem & tráng miệng",
  bar: "Quán bar",
  pub: "Quán pub",
  bakery: "Tiệm bánh",
};

function buildAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:ward"],
    tags["addr:district"],
    tags["addr:city"],
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return tags["addr:full"] ?? "Địa chỉ chưa cập nhật (xem trên bản đồ)";
}

function parseOpenNow(tags: Record<string, string>): boolean | null {
  const oh = tags.opening_hours;
  if (!oh) return null;
  if (oh === "24/7") return true;
  return null; // không parse lịch phức tạp ở client
}

function toFoodPlace(el: OverpassElement): FoodPlace | null {
  const tags = el.tags ?? {};
  const name = tags.name || tags["name:vi"] || tags["name:en"];
  if (!name) return null; // bỏ quán không tên cho chất lượng

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const amenity = (tags.amenity ?? "restaurant").toLowerCase();
  const cuisine = tags.cuisine
    ? tags.cuisine.split(";")[0].replace(/_/g, " ")
    : (AMENITY_VI[amenity] ?? "Quán ăn");

  const ratingRaw = tags.stars ? Number(tags.stars) : NaN;
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : null;

  const descParts: string[] = [];
  if (tags.cuisine) descParts.push(`Món: ${tags.cuisine.replace(/[_;]/g, " ")}.`);
  if (tags.opening_hours) descParts.push(`Giờ mở: ${tags.opening_hours}.`);
  if (tags.phone || tags["contact:phone"])
    descParts.push(`ĐT: ${tags.phone ?? tags["contact:phone"]}.`);
  const description =
    descParts.join(" ") || "Quán ăn quanh khu vực bạn (dữ liệu OpenStreetMap).";

  const mapped = mapTags(tags);

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    cuisine,
    description,
    tags: mapped,
    rating,
    reviews: null,
    priceLevel: null,
    address: buildAddress(tags),
    location: { lat, lng: lon },
    openNow: parseOpenNow(tags),
    // Ảnh thật từ OSM nếu có, ngược lại ảnh món thật theo loại
    photoUrl: osmRealImage(tags) ?? pickFoodPhoto(mapped, `osm${el.id}`),
    source: "osm",
    mapUrl:
      tags.website ||
      `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

export type FetchPlacesResult = {
  places: FoodPlace[];
};

/** Lấy elements Overpass: ưu tiên proxy serverless (ổn định + cache), fallback gọi thẳng */
async function fetchOverpassElements(
  origin: LatLng,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  // 1) Proxy same-origin /api/nearby (server-side, có cache CDN, không lo CORS/UA)
  try {
    const lat = origin.lat.toFixed(3); // làm tròn ~110m để tăng cache hit
    const lng = origin.lng.toFixed(3);
    const res = await fetch(
      `/api/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
      { signal },
    );
    if (res.ok) {
      const data = (await res.json()) as OverpassResponse & { error?: string };
      if (Array.isArray(data.elements) && (data.elements.length > 0 || !data.error)) {
        return data.elements;
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    // proxy không có (vd local dev) → fallback gọi thẳng
  }

  // 2) Fallback: gọi trực tiếp các endpoint Overpass
  const radiusM = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:25];
(
  nwr[amenity~"${AMENITY_RE}"](around:${radiusM},${origin.lat},${origin.lng});
);
out center 150;`;

  let lastError: unknown = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal,
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const data = (await res.json()) as OverpassResponse;
      return data.elements;
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Không gọi được Overpass API");
}

/**
 * Lấy danh sách quán quanh `origin` trong bán kính `radiusKm` (km).
 */
export async function fetchNearbyPlaces(
  origin: LatLng,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<FetchPlacesResult> {
  const elements = await fetchOverpassElements(origin, radiusKm, signal);

  const places = elements
    .map(toFoodPlace)
    .filter((p): p is FoodPlace => p !== null);

  // Dedupe theo tên + toạ độ ~ (tránh trùng node/way cùng quán)
  const seen = new Set<string>();
  const unique = places.filter((p) => {
    const key = `${p.name}|${p.location.lat.toFixed(4)}|${p.location.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { places: unique };
}

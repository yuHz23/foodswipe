// Shared types cho FoodSwipe

export type LatLng = {
  lat: number;
  lng: number;
};

/** Bán kính tìm kiếm (km) — chỉ cho phép các mốc cố định */
export type RadiusKm = 5 | 10 | 15 | 20;

export const RADIUS_OPTIONS: RadiusKm[] = [5, 10, 15, 20];

/** Mức giá: 1 = rẻ, 4 = sang */
export type PriceLevel = 1 | 2 | 3 | 4;

export type FoodTag =
  | "Phở"
  | "Bún"
  | "Cơm"
  | "Lẩu"
  | "Nướng"
  | "Cà phê"
  | "Trà sữa"
  | "Bánh"
  | "Hải sản"
  | "Chay"
  | "Ăn vặt"
  | "Pizza";

export const ALL_TAGS: FoodTag[] = [
  "Phở",
  "Bún",
  "Cơm",
  "Lẩu",
  "Nướng",
  "Cà phê",
  "Trà sữa",
  "Bánh",
  "Hải sản",
  "Chay",
  "Ăn vặt",
  "Pizza",
];

export type SortMode = "distance" | "rating" | "price";

export type PlaceSource = "mock" | "osm";

export type FoodPlace = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  /** Tag tự do (mock dùng FoodTag, OSM map từ cuisine) */
  tags: string[];
  /** 0..5; null nếu nguồn dữ liệu không có (vd OSM) */
  rating: number | null;
  reviews: number | null;
  priceLevel: PriceLevel | null;
  address: string;
  location: LatLng;
  openNow: boolean | null;
  photoUrl: string;
  source: PlaceSource;
  /** Link bản đồ ưu tiên (vd trang OSM); fallback dùng Google Maps theo toạ độ */
  mapUrl?: string;
};

export type DataSource = "live" | "demo";

export type UserPrefs = {
  radiusKm: RadiusKm;
  sortMode: SortMode;
  /** Lọc theo tag; rỗng = không lọc */
  activeTags: FoodTag[];
  /** Giá tối đa cho phép (1..4) */
  maxPrice: PriceLevel;
  /** Chỉ hiện quán đang mở (ẩn quán đã đóng) */
  openNowOnly: boolean;
};

export type LocationStatus = "idle" | "loading" | "ready" | "denied" | "error";

/** FoodPlace kèm khoảng cách đã tính (dùng trong UI) */
export type RankedPlace = FoodPlace & { distanceKm: number };

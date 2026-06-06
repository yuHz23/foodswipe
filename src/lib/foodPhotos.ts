/**
 * Chọn ảnh món ăn thật theo loại quán (keyless).
 * Dùng LoremFlickr (ảnh Flickr thật, khớp từ khoá) + lock theo id để ổn định.
 * Ưu tiên ảnh thật từ OSM (image / wikimedia_commons) nếu quán có.
 */

/** Map tag tiếng Việt → từ khoá ảnh (1 keyword mạnh để Flickr khớp đúng món) */
const TAG_KEYWORD: Record<string, string> = {
  Phở: "pho",
  Bún: "noodles",
  Cơm: "rice",
  Lẩu: "hotpot",
  Nướng: "barbecue",
  "Cà phê": "coffee",
  "Trà sữa": "bubbletea",
  "Hải sản": "seafood",
  Chay: "vegetarian",
  Pizza: "pizza",
  Bánh: "bakery",
  "Ăn vặt": "streetfood",
  "Nhà hàng": "restaurant",
  "Quán bar": "cocktail",
  "Quán nhậu": "beer",
  "Ẩm thực": "food",
};

const DEFAULT_KEYWORD = "food";

function hashInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Ảnh dự phòng nếu LoremFlickr lỗi (đảm bảo luôn có hình) */
export function fallbackPhoto(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/1000`;
}

/** Chọn ảnh món theo tag + id (ổn định nhờ lock) */
export function pickFoodPhoto(tags: string[], seed: string): string {
  const keyword =
    tags.map((t) => TAG_KEYWORD[t]).find(Boolean) ?? DEFAULT_KEYWORD;
  const lock = hashInt(seed) % 1000;
  return `https://loremflickr.com/800/1000/${keyword}?lock=${lock}`;
}

/** Lấy URL ảnh thật từ tag OSM nếu có (image trực tiếp hoặc Wikimedia Commons) */
export function osmRealImage(
  tags: Record<string, string>,
): string | null {
  const img = tags.image;
  if (img && /^https?:\/\//i.test(img)) return img;

  const commons = tags.wikimedia_commons;
  if (commons && commons.startsWith("File:")) {
    const file = commons.slice("File:".length);
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
      file,
    )}?width=800`;
  }
  return null;
}

// Vercel Serverless Function — proxy Overpass (OpenStreetMap) lấy quán quanh toạ độ.
// Server-side: ổn định hơn browser, set User-Agent, cache CDN để lần sau nhanh.

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const AMENITY_RE =
  "^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|bakery)$";

function sendJson(res, body, ttl) {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${ttl}, stale-while-revalidate=120`,
  );
  return res.status(200).json(body);
}

export default async function handler(req, res) {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng)
    return res.status(400).json({ elements: [], error: "missing-params" });

  const radiusM = Math.min(
    20000,
    Math.max(500, Math.round(Number(radius || 10) * 1000)),
  );
  const query = `[out:json][timeout:25];
(
  nwr[amenity~"${AMENITY_RE}"](around:${radiusM},${lat},${lng});
);
out center 150;`;

  let lastStatus = 0;
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "FoodSwipe/1.0 (https://foodswipe-blush.vercel.app)",
          Accept: "application/json",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!r.ok) {
        lastStatus = r.status;
        continue;
      }
      const data = await r.json();
      // Có dữ liệu → cache 1 giờ
      return sendJson(res, { elements: data.elements || [] }, 3600);
    } catch (e) {
      // thử endpoint kế tiếp
    }
  }
  // Tất cả lỗi → cache ngắn để retry sớm
  return sendJson(res, { elements: [], error: `overpass-${lastStatus || "fail"}` }, 30);
}

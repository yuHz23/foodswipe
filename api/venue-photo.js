// Vercel Serverless Function — trả ảnh thật của quán từ Foursquare Places API.
// Key giữ ở server (env FOURSQUARE_API_KEY), client gọi /api/venue-photo.
// Thử API mới (places-api.foursquare.com, Bearer) trước, fallback v3 legacy.

const FSQ_VERSION = "2025-06-17";

async function tryNewApi(key, lat, lng, name) {
  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: "150",
    limit: "1",
    fields: "fsq_place_id,name,photos",
  });
  if (name) params.set("query", name);

  const r = await fetch(
    `https://places-api.foursquare.com/places/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Places-Api-Version": FSQ_VERSION,
        Accept: "application/json",
      },
    },
  );
  if (!r.ok) return { ok: false, status: r.status };
  const data = await r.json();
  const place = data.results?.[0];
  const photo = place?.photos?.[0];
  const url = photo ? `${photo.prefix}original${photo.suffix}` : null;
  return { ok: true, photo: url, name: place?.name ?? null };
}

async function tryLegacyV3(key, lat, lng, name) {
  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: "150",
    limit: "1",
    fields: "fsq_id,name,photos",
  });
  if (name) params.set("query", name);

  const r = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
    headers: { Authorization: key, Accept: "application/json" },
  });
  if (!r.ok) return { ok: false, status: r.status };
  const data = await r.json();
  const place = data.results?.[0];
  const photo = place?.photos?.[0];
  const url = photo ? `${photo.prefix}original${photo.suffix}` : null;
  return { ok: true, photo: url, name: place?.name ?? null };
}

// Cache lâu khi có ảnh thật; cache ngắn cho rỗng/lỗi để ảnh tự xuất hiện
// ngay khi credit Foursquare khả dụng (không kẹt cache 7 ngày).
function sendJson(res, body, ttl) {
  res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=60`);
  return res.status(200).json(body);
}

export default async function handler(req, res) {
  const key = process.env.FOURSQUARE_API_KEY;
  const { lat, lng, name } = req.query;

  if (!key) return sendJson(res, { photo: null, reason: "no-key" }, 300);
  if (!lat || !lng)
    return sendJson(res, { photo: null, reason: "missing-params" }, 60);

  const q = typeof name === "string" ? name : undefined;

  try {
    // Thử API mới trước
    let result = await tryNewApi(key, lat, lng, q);
    // Nếu key thuộc loại legacy (401/403) hoặc endpoint mới lỗi → thử v3
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      result = await tryLegacyV3(key, lat, lng, q);
    }
    if (!result.ok) {
      // lỗi (vd hết credit 429) → cache ngắn để retry sớm
      return sendJson(res, { photo: null, reason: `fsq-${result.status}` }, 120);
    }
    // Có ảnh → cache 7 ngày; không có ảnh cho quán này → cache 1 ngày
    const ttl = result.photo ? 604800 : 86400;
    return sendJson(res, { photo: result.photo, name: result.name }, ttl);
  } catch (e) {
    return sendJson(res, { photo: null, reason: "error" }, 120);
  }
}

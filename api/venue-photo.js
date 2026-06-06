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

export default async function handler(req, res) {
  const key = process.env.FOURSQUARE_API_KEY;
  const { lat, lng, name } = req.query;

  // Cache cạnh CDN 7 ngày để giảm số lần gọi Foursquare
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=604800, stale-while-revalidate=86400",
  );

  if (!key) return res.status(200).json({ photo: null, reason: "no-key" });
  if (!lat || !lng)
    return res.status(400).json({ photo: null, reason: "missing-params" });

  const q = typeof name === "string" ? name : undefined;

  try {
    // Thử API mới trước
    let result = await tryNewApi(key, lat, lng, q);
    // Nếu key thuộc loại legacy (401/403) hoặc endpoint mới lỗi → thử v3
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      result = await tryLegacyV3(key, lat, lng, q);
    }
    if (!result.ok) {
      return res.status(200).json({ photo: null, reason: `fsq-${result.status}` });
    }
    return res.status(200).json({ photo: result.photo, name: result.name });
  } catch (e) {
    return res.status(200).json({ photo: null, reason: "error" });
  }
}

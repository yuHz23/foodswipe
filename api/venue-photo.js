// Vercel Serverless Function — trả ảnh thật của quán.
// Nguồn ưu tiên: Foursquare (FOURSQUARE_API_KEY) → Google Places (GOOGLE_MAPS_API_KEY).
// Key giữ ở server, client gọi /api/venue-photo. Graceful: hết nguồn → photo:null.

const FSQ_VERSION = "2025-06-17";

// ---- Foursquare ----
async function fsqSearch(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) return { ok: false, status: r.status };
  const data = await r.json();
  const place = data.results?.[0];
  const photo = place?.photos?.[0];
  const photoUrl = photo ? `${photo.prefix}original${photo.suffix}` : null;
  return { ok: true, photo: photoUrl, name: place?.name ?? null };
}

async function tryFoursquare(key, lat, lng, name) {
  const qp = (idField) => {
    const p = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: "150",
      limit: "1",
      fields: `${idField},name,photos`,
    });
    if (name) p.set("query", name);
    return p;
  };
  // API mới (Bearer)
  let r = await fsqSearch(
    `https://places-api.foursquare.com/places/search?${qp("fsq_place_id")}`,
    {
      Authorization: `Bearer ${key}`,
      "X-Places-Api-Version": FSQ_VERSION,
      Accept: "application/json",
    },
  );
  // Key legacy → thử v3
  if (!r.ok && (r.status === 401 || r.status === 403)) {
    r = await fsqSearch(
      `https://api.foursquare.com/v3/places/search?${qp("fsq_id")}`,
      { Authorization: key, Accept: "application/json" },
    );
  }
  return r;
}

// ---- Google Places (New) ----
async function tryGooglePlaces(key, lat, lng, name) {
  // 1) Text Search tìm quán quanh toạ độ
  const searchRes = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
      },
      body: JSON.stringify({
        textQuery: name || "nhà hàng quán ăn",
        locationBias: {
          circle: {
            center: { latitude: Number(lat), longitude: Number(lng) },
            radius: 250,
          },
        },
        maxResultCount: 1,
        languageCode: "vi",
      }),
    },
  );
  if (!searchRes.ok) return { ok: false, status: searchRes.status };
  const data = await searchRes.json();
  const place = data.places?.[0];
  const photoName = place?.photos?.[0]?.name;
  const displayName = place?.displayName?.text ?? null;
  if (!photoName) return { ok: true, photo: null, name: displayName };

  // 2) Lấy ảnh: skipHttpRedirect=true → trả JSON photoUri (googleusercontent, không kèm key)
  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`,
  );
  if (!mediaRes.ok) return { ok: false, status: mediaRes.status };
  const media = await mediaRes.json();
  return { ok: true, photo: media.photoUri ?? null, name: displayName };
}

// Cache lâu khi có ảnh; ngắn cho rỗng/lỗi để ảnh tự hiện khi nguồn sẵn sàng.
function sendJson(res, body, ttl) {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${ttl}, stale-while-revalidate=60`,
  );
  return res.status(200).json(body);
}

export default async function handler(req, res) {
  const fsqKey = process.env.FOURSQUARE_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const { lat, lng, name } = req.query;

  if (!fsqKey && !googleKey)
    return sendJson(res, { photo: null, reason: "no-key" }, 300);
  if (!lat || !lng)
    return sendJson(res, { photo: null, reason: "missing-params" }, 60);

  const q = typeof name === "string" ? name : undefined;
  let photo = null;
  let vName = null;
  let source = null;

  // 1) Foursquare (giữ nguyên)
  if (fsqKey) {
    try {
      const r = await tryFoursquare(fsqKey, lat, lng, q);
      if (r.ok && r.photo) {
        photo = r.photo;
        vName = r.name;
        source = "foursquare";
      }
    } catch {
      // bỏ qua, thử nguồn kế
    }
  }

  // 2) Google Places (bổ sung)
  if (!photo && googleKey) {
    try {
      const g = await tryGooglePlaces(googleKey, lat, lng, q);
      if (g.ok && g.photo) {
        photo = g.photo;
        vName = g.name;
        source = "google";
      }
    } catch {
      // bỏ qua
    }
  }

  if (photo)
    return sendJson(res, { photo, name: vName, source }, 604800);
  return sendJson(res, { photo: null, reason: "no-photo" }, 120);
}

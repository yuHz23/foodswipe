// Vercel Serverless Function — lấy ẢNH + SAO + số review thật của quán.
// Chuỗi nguồn (tự switch khi nguồn trước thiếu): Foursquare → Yelp → Google (chỉ ảnh).
// Key giữ ở server. Graceful: hết nguồn → trả null, app dùng dữ liệu sẵn có.

const FSQ_VERSION = "2025-06-17";

// ---- Foursquare (rating thang 0..10 → quy về 0..5) ----
async function tryFoursquare(key, lat, lng, name) {
  const p = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: "200",
    limit: "1",
    fields: "name,rating,stats,photos",
  });
  if (name) p.set("query", name);
  const r = await fetch(
    `https://places-api.foursquare.com/places/search?${p}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Places-Api-Version": FSQ_VERSION,
        Accept: "application/json",
      },
    },
  );
  if (!r.ok) return { ok: false, status: r.status };
  const d = await r.json();
  const pl = d.results?.[0];
  if (!pl) return { ok: true, rating: null, reviewCount: null, photo: null };
  const ph = pl.photos?.[0];
  return {
    ok: true,
    rating:
      typeof pl.rating === "number" ? Math.round((pl.rating / 2) * 10) / 10 : null,
    reviewCount: pl.stats?.total_ratings ?? null,
    photo: ph ? `${ph.prefix}original${ph.suffix}` : null,
  };
}

// ---- Yelp Fusion (rating 0..5) ----
async function tryYelp(key, lat, lng, name) {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    radius: "1000",
    limit: "1",
    sort_by: "distance",
  });
  if (name) p.set("term", name);
  const r = await fetch(`https://api.yelp.com/v3/businesses/search?${p}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!r.ok) return { ok: false, status: r.status };
  const d = await r.json();
  const b = d.businesses?.[0];
  if (!b) return { ok: true, rating: null, reviewCount: null, photo: null };
  return {
    ok: true,
    rating: typeof b.rating === "number" ? b.rating : null,
    reviewCount: b.review_count ?? null,
    photo: b.image_url || null,
  };
}

// ---- Google Places (chỉ ảnh) ----
async function tryGooglePlaces(key, lat, lng, name) {
  const searchRes = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.photos",
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
  const photoName = data.places?.[0]?.photos?.[0]?.name;
  if (!photoName) return { ok: true, photo: null };
  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`,
  );
  if (!mediaRes.ok) return { ok: false, status: mediaRes.status };
  const media = await mediaRes.json();
  return { ok: true, photo: media.photoUri ?? null };
}

function sendJson(res, body, ttl) {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${ttl}, stale-while-revalidate=60`,
  );
  return res.status(200).json(body);
}

export default async function handler(req, res) {
  const fsqKey = process.env.FOURSQUARE_API_KEY;
  const yelpKey = process.env.YELP_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const { lat, lng, name } = req.query;

  const empty = { photo: null, rating: null, reviewCount: null, source: null };
  if (!fsqKey && !yelpKey && !googleKey)
    return sendJson(res, { ...empty, reason: "no-key" }, 300);
  if (!lat || !lng)
    return sendJson(res, { ...empty, reason: "missing-params" }, 60);

  const q = typeof name === "string" ? name : undefined;
  const out = { ...empty };

  // 1) Foursquare
  if (fsqKey) {
    try {
      const r = await tryFoursquare(fsqKey, lat, lng, q);
      if (r.ok) {
        if (r.rating != null) {
          out.rating = r.rating;
          out.reviewCount = r.reviewCount;
          out.source = out.source || "foursquare";
        }
        if (r.photo) {
          out.photo = r.photo;
          out.source = out.source || "foursquare";
        }
      }
    } catch {
      /* switch nguồn kế */
    }
  }

  // 2) Yelp — lấp chỗ thiếu khi Foursquare hết/không có
  if (yelpKey && (out.rating == null || out.photo == null)) {
    try {
      const y = await tryYelp(yelpKey, lat, lng, q);
      if (y.ok) {
        if (out.rating == null && y.rating != null) {
          out.rating = y.rating;
          out.reviewCount = y.reviewCount;
          out.source = out.source || "yelp";
        }
        if (out.photo == null && y.photo) {
          out.photo = y.photo;
          out.source = out.source || "yelp";
        }
      }
    } catch {
      /* thử Google */
    }
  }

  // 3) Google — chỉ bổ sung ảnh
  if (googleKey && out.photo == null) {
    try {
      const g = await tryGooglePlaces(googleKey, lat, lng, q);
      if (g.ok && g.photo) {
        out.photo = g.photo;
        out.source = out.source || "google";
      }
    } catch {
      /* bỏ qua */
    }
  }

  const hasData = out.photo || out.rating != null;
  return sendJson(res, out, hasData ? 604800 : 120);
}

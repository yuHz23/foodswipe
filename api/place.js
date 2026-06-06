// Vercel Serverless Function — tải 1 đối tượng OSM theo type+id (cho link chia sẻ).

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export default async function handler(req, res) {
  const { type, id } = req.query;
  const t =
    type === "way" ? "way" : type === "relation" ? "relation" : "node";
  const oid = Number(id);
  if (!Number.isInteger(oid) || oid <= 0)
    return res.status(400).json({ element: null, error: "bad-id" });

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=600",
  );

  const query = `[out:json];${t}(${oid});out center 1;`;
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
      if (!r.ok) continue;
      const data = await r.json();
      return res.status(200).json({ element: data.elements?.[0] ?? null });
    } catch (e) {
      // thử endpoint kế
    }
  }
  return res.status(200).json({ element: null, error: "overpass-fail" });
}

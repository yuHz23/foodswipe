import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { FOOD_PLACES } from "@/data/foodPlaces";
import { fetchOsmPlace } from "@/lib/overpass";
import { haversineKm, formatKm } from "@/utils/geo";
import { priceLabel, handleImgError } from "@/components/FoodCard";
import {
  openInGoogleMaps,
  googleDirectionsUrl,
} from "@/lib/maps";
import AppShell from "@/components/AppShell";
import Pill from "@/components/Pill";
import { cn } from "@/lib/utils";
import type { FoodPlace, PlaceDetails } from "@/types";

const POSITIVE = new Set([
  "yes",
  "only",
  "free",
  "wlan",
  "wifi",
  "designated",
  "limited",
  "outside",
  "separated",
]);

type Feature = { label: string; ok: boolean | null };

function featureChips(d: PlaceDetails): Feature[] {
  const val = (v?: string): boolean | null =>
    v == null ? null : POSITIVE.has(v.toLowerCase()) ? true : v.toLowerCase() === "no" ? false : true;

  const out: Feature[] = [];
  const add = (label: string, v?: string) => {
    const ok = val(v);
    if (ok !== null) out.push({ label, ok });
  };
  add("Wifi", d.internetAccess);
  add("Máy lạnh", d.airConditioning);
  add("Ngồi ngoài trời", d.outdoorSeating);
  add("Mang đi", d.takeaway);
  add("Giao hàng", d.delivery);
  add("Ăn tại chỗ", d.dineIn);
  add("Đặt bàn trước", d.reservation);
  add("Lối xe lăn", d.wheelchair);
  if (d.smoking) {
    const ok = d.smoking.toLowerCase() === "no";
    out.push({ label: ok ? "Không khói thuốc" : "Có khu hút thuốc", ok: true });
  }
  return out;
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userLocation, likedIds, like, unlike, placeCache, ensureVenuePhoto } =
    useFoodSwipeStore();

  const cached = useMemo(
    () =>
      (id ? placeCache[id] : undefined) ?? FOOD_PLACES.find((p) => p.id === id),
    [id, placeCache],
  );

  // Nếu mở link chia sẻ mà chưa có trong cache → tải theo id OSM
  const [remote, setRemote] = useState<FoodPlace | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const place = cached ?? remote;

  useEffect(() => {
    if (cached || !id || !id.startsWith("osm-")) return;
    let alive = true;
    setLoadingRemote(true);
    fetchOsmPlace(id)
      .then((p) => alive && setRemote(p))
      .finally(() => alive && setLoadingRemote(false));
    return () => {
      alive = false;
    };
  }, [cached, id]);

  useEffect(() => {
    if (place) void ensureVenuePhoto(place);
  }, [place?.id, ensureVenuePhoto]);

  const [copied, setCopied] = useState(false);

  if (!place) {
    return (
      <AppShell>
        <div className="flex h-[70vh] flex-col items-center justify-center text-center">
          {loadingRemote ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent" />
              <p className="mt-4 text-sm text-muted">Đang tải thông tin quán…</p>
            </>
          ) : (
            <>
              <span className="text-5xl">🤔</span>
              <h1 className="mt-4 font-display text-xl font-semibold">
                Không tìm thấy quán
              </h1>
              <button
                type="button"
                onClick={() => navigate("/swipe")}
                className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                Về trang lướt
              </button>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  const liked = likedIds.includes(place.id);
  const distanceKm = userLocation
    ? haversineKm(userLocation, place.location)
    : null;
  const details = place.details ?? {};
  const features = featureChips(details);
  const hoursLines = details.openingHours
    ? details.openingHours.split(";").map((s) => s.trim()).filter(Boolean)
    : [];
  const isRealPhoto = /^https?:\/\/(?!.*loremflickr|.*picsum)/.test(
    place.photoUrl,
  );

  const share = async () => {
    const url = `${window.location.origin}/detail/${place.id}`;
    const text = `${place.name} — ${place.cuisine} · ${place.address}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text, url });
      } catch {
        /* user huỷ */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Sao chép link để chia sẻ:", url);
    }
  };

  return (
    <AppShell>
      {/* Ảnh lớn + nút back/chia sẻ */}
      <div className="relative -mx-4 -mt-5 h-72 overflow-hidden">
        <img
          src={place.photoUrl}
          alt={place.name}
          onError={(e) => handleImgError(e, place.id)}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/30" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
        >
          ←
        </button>
        <button
          type="button"
          onClick={share}
          aria-label="Chia sẻ"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
        >
          ⤴
        </button>
        {copied && (
          <span className="absolute right-4 top-16 rounded-lg bg-black/70 px-2.5 py-1 text-xs text-white">
            Đã copy link!
          </span>
        )}
      </div>

      <div className="-mt-6 space-y-5">
        <header>
          <div className="flex flex-wrap gap-1.5">
            {place.tags.map((t) => (
              <Pill key={t} variant="accent">
                {t}
              </Pill>
            ))}
            {place.priceLevel !== null && (
              <Pill>{priceLabel(place.priceLevel)}</Pill>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">{place.name}</h1>
          <p className="text-muted">
            {place.cuisine}
            {details.brand ? ` · ${details.brand}` : ""}
          </p>
        </header>

        {/* Thông số */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat
            label="Đánh giá"
            value={place.rating !== null ? `⭐ ${place.rating.toFixed(1)}` : "—"}
          />
          <Stat
            label="Khoảng cách"
            value={distanceKm !== null ? formatKm(distanceKm) : "—"}
          />
          <Stat
            label="Trạng thái"
            value={
              place.openNow === null
                ? "—"
                : place.openNow
                  ? "🟢 Đang mở"
                  : "🔴 Đã đóng"
            }
          />
        </div>

        {place.description && (
          <p className="text-sm leading-relaxed text-text/90">
            {place.description}
          </p>
        )}

        {/* Liên hệ */}
        {(details.phone || details.website) && (
          <Section title="Liên hệ">
            <div className="flex flex-col gap-2">
              {details.phone && (
                <a
                  href={`tel:${details.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-sm font-medium text-accent"
                >
                  📞 {details.phone}
                </a>
              )}
              {details.website && (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 truncate text-sm font-medium text-accent"
                >
                  🌐 {details.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Giờ mở cửa */}
        {hoursLines.length > 0 && (
          <Section title="Giờ mở cửa">
            <ul className="space-y-1 text-sm">
              {hoursLines.map((line, i) => (
                <li key={i} className="text-text/90">
                  {line}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Tiện ích */}
        {features.length > 0 && (
          <Section title="Tiện ích">
            <div className="flex flex-wrap gap-1.5">
              {features.map((f) => (
                <span
                  key={f.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                    f.ok
                      ? "border-like/30 bg-like/10 text-like"
                      : "border-border bg-surface-2 text-muted line-through",
                  )}
                >
                  {f.ok ? "✓" : "✗"} {f.label}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Thanh toán & chế độ ăn */}
        {(details.cash || details.cards || details.diet) && (
          <Section title="Thanh toán & chế độ ăn">
            <div className="flex flex-wrap gap-1.5">
              {details.cash && <Pill>💵 Tiền mặt</Pill>}
              {details.cards && <Pill>💳 Thẻ</Pill>}
              {details.diet?.map((d) => (
                <Pill key={d} variant="success">
                  🌿 {d}
                </Pill>
              ))}
            </div>
          </Section>
        )}

        {/* Địa chỉ */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Địa chỉ</p>
          <p className="mt-1 text-sm">{place.address}</p>
          <p className="mt-1 text-xs text-muted">
            Toạ độ: {place.location.lat.toFixed(5)},{" "}
            {place.location.lng.toFixed(5)}
            {place.source === "osm" ? " · Nguồn: OpenStreetMap" : ""}
          </p>
          {!isRealPhoto && (
            <p className="mt-2 text-xs text-muted">
              📷 Ảnh minh hoạ theo loại món — bấm Google Maps để xem ảnh thật của
              quán.
            </p>
          )}
        </div>
      </div>

      {/* Hành động */}
      <div className="sticky bottom-3 mt-6 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (liked ? unlike(place.id) : like(place.id))}
            className={
              liked
                ? "flex-1 rounded-2xl border-2 border-like bg-like/10 px-4 py-3.5 text-sm font-bold text-like"
                : "flex-1 rounded-2xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-card"
            }
          >
            {liked ? "❤ Đã thích — bỏ thích" : "🤍 Thích quán này"}
          </button>
          <button
            type="button"
            onClick={share}
            className="rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold"
          >
            ⤴ Chia sẻ
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openInGoogleMaps(place)}
            className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
          >
            🗺️ Xem trên Maps
          </button>
          <a
            href={googleDirectionsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-semibold"
          >
            🧭 Chỉ đường
          </a>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface py-3">
      <p className="font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

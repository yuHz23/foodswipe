import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { FOOD_PLACES } from "@/data/foodPlaces";
import { haversineKm, formatKm } from "@/utils/geo";
import { priceLabel, handleImgError } from "@/components/FoodCard";
import { openInGoogleMaps } from "@/lib/maps";
import AppShell from "@/components/AppShell";
import Pill from "@/components/Pill";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userLocation, likedIds, like, unlike, placeCache } =
    useFoodSwipeStore();

  const place = useMemo(
    () =>
      (id ? placeCache[id] : undefined) ?? FOOD_PLACES.find((p) => p.id === id),
    [id, placeCache],
  );

  if (!place) {
    return (
      <AppShell>
        <div className="flex h-[70vh] flex-col items-center justify-center text-center">
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
        </div>
      </AppShell>
    );
  }

  const liked = likedIds.includes(place.id);
  const distanceKm = userLocation
    ? haversineKm(userLocation, place.location)
    : null;

  const openMaps = () => openInGoogleMaps(place);

  return (
    <AppShell>
      {/* Ảnh lớn + nút back */}
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
          <p className="text-muted">{place.cuisine}</p>
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
                  ? "Đang mở"
                  : "Đã đóng"
            }
          />
        </div>

        <p className="text-sm leading-relaxed text-text/90">
          {place.description}
        </p>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Địa chỉ</p>
          <p className="mt-1 text-sm">{place.address}</p>
          <p className="mt-0.5 text-xs text-muted">
            {place.reviews !== null
              ? `${place.reviews.toLocaleString("vi-VN")} lượt đánh giá`
              : place.source === "osm"
                ? "Nguồn: OpenStreetMap"
                : ""}
          </p>
        </div>
      </div>

      {/* Hành động */}
      <div className="sticky bottom-3 mt-6 flex gap-2">
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
          onClick={openMaps}
          className="rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold"
        >
          🗺️ Maps
        </button>
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

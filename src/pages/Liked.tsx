import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { FOOD_PLACES } from "@/data/foodPlaces";
import { haversineKm, formatKm } from "@/utils/geo";
import { priceLabel } from "@/components/FoodCard";
import AppShell from "@/components/AppShell";
import Pill from "@/components/Pill";

export default function Liked() {
  const navigate = useNavigate();
  const { userLocation, likedIds, unlike, placeCache } = useFoodSwipeStore();

  const likedPlaces = useMemo(() => {
    // Giữ thứ tự thích gần nhất lên đầu; tra cache trước, fallback mock
    return [...likedIds]
      .reverse()
      .map((id) => placeCache[id] ?? FOOD_PLACES.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [likedIds, placeCache]);

  const openMaps = (lat: number, lng: number) =>
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank",
      "noopener,noreferrer",
    );

  return (
    <AppShell>
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">Đã thích</h1>
        <p className="text-sm text-muted">{likedPlaces.length} quán</p>
      </header>

      {likedPlaces.length === 0 ? (
        <div className="flex h-[60vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border text-center">
          <span className="text-5xl">💔</span>
          <h2 className="mt-4 font-display text-lg font-semibold">
            Chưa thích quán nào
          </h2>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Quẹt phải ở trang Lướt để lưu quán bạn thích vào đây.
          </p>
          <button
            type="button"
            onClick={() => navigate("/swipe")}
            className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
          >
            Đi lướt ngay 🔥
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {likedPlaces.map((place) => {
            const distanceKm = userLocation
              ? haversineKm(userLocation, place.location)
              : null;
            return (
              <li
                key={place.id}
                className="flex gap-3 rounded-2xl border border-border bg-surface p-3 animate-fade-in"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/detail/${place.id}`)}
                  className="shrink-0"
                >
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/detail/${place.id}`)}
                    className="block text-left"
                  >
                    <h3 className="truncate font-semibold">{place.name}</h3>
                    <p className="truncate text-xs text-muted">
                      {place.cuisine}
                    </p>
                  </button>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {place.rating !== null && (
                      <Pill variant="ghost">⭐ {place.rating.toFixed(1)}</Pill>
                    )}
                    {distanceKm !== null && (
                      <Pill variant="ghost">📍 {formatKm(distanceKm)}</Pill>
                    )}
                    {place.priceLevel !== null && (
                      <Pill variant="ghost">{priceLabel(place.priceLevel)}</Pill>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    type="button"
                    aria-label="Bỏ thích"
                    onClick={() => unlike(place.id)}
                    className="text-skip"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    aria-label="Mở bản đồ"
                    onClick={() => openMaps(place.location.lat, place.location.lng)}
                    className="text-lg"
                  >
                    🗺️
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

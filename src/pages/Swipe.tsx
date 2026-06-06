import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { buildDeck } from "@/lib/selectors";
import AppShell from "@/components/AppShell";
import SwipeDeck, { type SwipeDeckHandle } from "@/components/SwipeDeck";
import Pill from "@/components/Pill";
import type { RankedPlace } from "@/types";
import type { SwipeDirection } from "@/components/SwipeCard";

export default function Swipe() {
  const navigate = useNavigate();
  const deckRef = useRef<SwipeDeckHandle>(null);

  const {
    userLocation,
    locationStatus,
    prefs,
    likedIds,
    hiddenIds,
    like,
    hide,
    places,
    placesStatus,
    placesError,
    dataSource,
    loadNearbyPlaces,
    setDataSource,
    ensureVenuePhoto,
  } = useFoodSwipeStore();

  // Chưa có vị trí → quay lại onboarding
  useEffect(() => {
    if (!userLocation || locationStatus !== "ready") {
      navigate("/", { replace: true });
    }
  }, [userLocation, locationStatus, navigate]);

  // Tải quán quanh vị trí lần đầu vào trang (hoặc sau khi reload trang)
  useEffect(() => {
    if (userLocation && places.length === 0 && placesStatus === "idle") {
      void loadNearbyPlaces();
    }
  }, [userLocation, places.length, placesStatus, loadNearbyPlaces]);

  const deck = useMemo<RankedPlace[]>(() => {
    if (!userLocation) return [];
    return buildDeck({
      places,
      origin: userLocation,
      prefs,
      likedIds,
      hiddenIds,
    });
  }, [userLocation, places, prefs, likedIds, hiddenIds]);

  // Lấy ảnh thật từng quán (Foursquare) cho vài thẻ sắp tới
  useEffect(() => {
    deck.slice(0, 4).forEach((p) => void ensureVenuePhoto(p));
  }, [deck, ensureVenuePhoto]);

  const handleSwiped = (dir: SwipeDirection, place: RankedPlace) => {
    if (dir === "like") like(place.id);
    else hide(place.id);
  };

  // Phím tắt desktop: ←/→
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") deckRef.current?.swipeTop("skip");
      if (e.key === "ArrowRight") deckRef.current?.swipeTop("like");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loading = placesStatus === "loading" && deck.length === 0;
  const errored = placesStatus === "error" && deck.length === 0;
  const empty = !loading && !errored && deck.length === 0;
  const showControls = deck.length > 0;

  return (
    <AppShell noPadding>
      <div className="flex h-[100dvh] flex-col px-4 pt-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Lướt</h1>
            <p className="text-sm text-muted">
              {loading
                ? "Đang tìm quán quanh bạn…"
                : `${deck.length} quán trong ${prefs.radiusKm} km`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Pill variant={dataSource === "live" ? "success" : "ghost"}>
              {dataSource === "live" ? "🛰️ Thật" : "🧪 Demo"}
            </Pill>
            <Pill variant="ghost">
              {prefs.sortMode === "distance"
                ? "Gần nhất"
                : prefs.sortMode === "rating"
                  ? "Đánh giá cao"
                  : "Giá thấp"}
            </Pill>
            {prefs.activeTags.length > 0 && (
              <Pill variant="accent">{prefs.activeTags.length} tag</Pill>
            )}
            {prefs.openNowOnly && <Pill variant="success">Đang mở</Pill>}
          </div>
        </header>

        {/* Deck */}
        <div className="relative my-4 flex-1">
          {loading ? (
            <LoadingState />
          ) : errored ? (
            <ErrorState
              message={placesError}
              onRetry={() => void loadNearbyPlaces()}
              onUseDemo={() => setDataSource("demo")}
            />
          ) : empty ? (
            <EmptyState
              hasFilters={prefs.activeTags.length > 0 || prefs.maxPrice < 4}
              isLive={dataSource === "live"}
              onGoSettings={() => navigate("/settings")}
              onGoLiked={() => navigate("/liked")}
              onUseDemo={() => setDataSource("demo")}
            />
          ) : (
            <SwipeDeck
              ref={deckRef}
              cards={deck}
              onSwiped={handleSwiped}
              onTap={(p) => navigate(`/detail/${p.id}`)}
            />
          )}
        </div>

        {/* Nút điều khiển */}
        {showControls && (
          <div className="mb-3 flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label="Bỏ qua"
              onClick={() => deckRef.current?.swipeTop("skip")}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-skip bg-surface text-2xl text-skip shadow-pop transition active:scale-90"
            >
              ✕
            </button>
            <button
              type="button"
              aria-label="Xem chi tiết"
              onClick={() => deck[0] && navigate(`/detail/${deck[0].id}`)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-pop transition active:scale-90"
            >
              ℹ️
            </button>
            <button
              type="button"
              aria-label="Thích"
              onClick={() => deckRef.current?.swipeTop("like")}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-like bg-surface text-2xl text-like shadow-pop transition active:scale-90"
            >
              ❤
            </button>
          </div>
        )}
        <p className="mb-2 text-center text-xs text-muted">
          Quẹt thẻ hoặc dùng phím ← / → trên máy tính
        </p>
      </div>
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/50 p-8 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
      <h2 className="mt-5 font-display text-lg font-semibold">
        Đang tìm quán quanh bạn…
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Lấy dữ liệu thật từ OpenStreetMap theo vị trí của bạn.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  onUseDemo,
}: {
  message: string | null;
  onRetry: () => void;
  onUseDemo: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-skip/40 bg-surface/50 p-8 text-center animate-pop-in">
      <span className="text-5xl">📡</span>
      <h2 className="mt-4 font-display text-xl font-semibold">
        Không tải được quán
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted">
        {message ?? "Có lỗi khi lấy dữ liệu."}
      </p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Thử lại
        </button>
        <button
          type="button"
          onClick={onUseDemo}
          className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold"
        >
          Dùng dữ liệu demo
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  isLive,
  onGoSettings,
  onGoLiked,
  onUseDemo,
}: {
  hasFilters: boolean;
  isLive: boolean;
  onGoSettings: () => void;
  onGoLiked: () => void;
  onUseDemo: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/50 p-8 text-center animate-pop-in">
      <span className="text-5xl">🍽️</span>
      <h2 className="mt-4 font-display text-xl font-semibold">
        Hết quán để lướt rồi!
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted">
        {hasFilters
          ? "Thử nới bán kính hoặc bỏ bớt bộ lọc trong Cài đặt để thấy thêm quán."
          : isLive
            ? "Không còn quán mới trong bán kính. Nới bán kính, reset lịch sử, hoặc thử khu vực demo."
            : "Bạn đã lướt hết quán trong bán kính. Mở rộng bán kính hoặc reset lịch sử nhé."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onGoSettings}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Mở Cài đặt
        </button>
        <button
          type="button"
          onClick={onGoLiked}
          className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold"
        >
          Xem đã thích
        </button>
        {isLive && (
          <button
            type="button"
            onClick={onUseDemo}
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold"
          >
            🧪 Thử demo
          </button>
        )}
      </div>
    </div>
  );
}

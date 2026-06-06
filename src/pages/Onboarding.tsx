import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { RADIUS_OPTIONS, type RadiusKm } from "@/types";
import AppShell from "@/components/AppShell";
import Segmented from "@/components/Segmented";
import Pill from "@/components/Pill";

export default function Onboarding() {
  const navigate = useNavigate();
  const {
    userLocation,
    locationStatus,
    locationError,
    isDemoLocation,
    requestGeolocation,
    useDemoLocation,
    setManualLocation,
    prefs,
    setRadius,
  } = useFoodSwipeStore();

  const [manualOpen, setManualOpen] = useState(false);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");

  const hasLocation = userLocation !== null && locationStatus === "ready";

  const submitManual = () => {
    const lat = Number(latText);
    const lng = Number(lngText);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setManualLocation({ lat, lng });
      setManualOpen(false);
    }
  };

  return (
    <AppShell hideNav>
      <div className="flex min-h-[100dvh] flex-col py-6">
        {/* Hero */}
        <header className="animate-fade-in">
          <Pill variant="accent">🍜 Lướt là đói</Pill>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight">
            FoodSwipe
          </h1>
          <p className="mt-2 text-muted">
            Lướt như Tinder để tìm món &amp; quán ngon quanh bạn. Quẹt phải để
            thích, quẹt trái để bỏ qua.
          </p>
        </header>

        <div className="mt-8 flex-1 space-y-6">
          {/* Bước 1: vị trí */}
          <section className="rounded-3xl border border-border bg-surface p-5 shadow-pop">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">1. Vị trí của bạn</h2>
              {hasLocation && (
                <Pill variant="success">
                  {isDemoLocation ? "Demo" : "Đã có"} ✓
                </Pill>
              )}
            </div>

            {hasLocation ? (
              <p className="mt-2 text-sm text-muted">
                {isDemoLocation
                  ? "Đang dùng vị trí demo (Quận 1, TP.HCM)."
                  : "Đã lấy vị trí hiện tại của bạn."}{" "}
                Toạ độ: {userLocation!.lat.toFixed(4)},{" "}
                {userLocation!.lng.toFixed(4)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Cho phép định vị để tính khoảng cách tới các quán.
              </p>
            )}

            {locationError && (
              <p className="mt-2 rounded-xl bg-skip/10 px-3 py-2 text-sm text-skip">
                {locationError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={requestGeolocation}
                disabled={locationStatus === "loading"}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
              >
                {locationStatus === "loading"
                  ? "Đang lấy..."
                  : "📍 Dùng vị trí thật"}
              </button>
              <button
                type="button"
                onClick={useDemoLocation}
                className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold transition active:scale-95"
              >
                🧪 Vị trí demo
              </button>
            </div>

            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="mt-3 text-sm font-medium text-accent"
            >
              {manualOpen ? "Ẩn nhập tay" : "Hoặc nhập toạ độ tay"}
            </button>

            {manualOpen && (
              <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  inputMode="decimal"
                  placeholder="Lat (10.78)"
                  value={latText}
                  onChange={(e) => setLatText(e.target.value)}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  inputMode="decimal"
                  placeholder="Lng (106.70)"
                  value={lngText}
                  onChange={(e) => setLngText(e.target.value)}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={submitManual}
                  className="rounded-xl bg-accent px-3 text-sm font-semibold text-white"
                >
                  OK
                </button>
              </div>
            )}
          </section>

          {/* Bước 2: bán kính */}
          <section className="rounded-3xl border border-border bg-surface p-5 shadow-pop">
            <h2 className="font-semibold">2. Bán kính tìm kiếm</h2>
            <p className="mt-1 text-sm text-muted">
              Chỉ hiện quán trong khoảng cách này.
            </p>
            <div className="mt-4">
              <Segmented<RadiusKm>
                aria-label="Chọn bán kính"
                options={RADIUS_OPTIONS.map((r) => ({
                  label: `${r} km`,
                  value: r,
                }))}
                value={prefs.radiusKm}
                onChange={setRadius}
              />
            </div>
            {hasLocation && (
              <p className="mt-3 text-sm text-muted">
                Sẽ tìm quán thật trong {prefs.radiusKm} km quanh bạn khi bắt đầu
                lướt.
              </p>
            )}
          </section>
        </div>

        {/* CTA */}
        <div className="sticky bottom-4 mt-6">
          <button
            type="button"
            disabled={!hasLocation}
            onClick={() => navigate("/swipe")}
            className="w-full rounded-2xl bg-accent px-6 py-4 text-base font-bold text-white shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasLocation ? "Bắt đầu lướt 🔥" : "Cần vị trí để bắt đầu"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

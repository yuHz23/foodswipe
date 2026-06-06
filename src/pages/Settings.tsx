import { useNavigate } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { useTheme } from "@/hooks/useTheme";
import {
  ALL_TAGS,
  RADIUS_OPTIONS,
  type DataSource,
  type PriceLevel,
  type RadiusKm,
  type SortMode,
} from "@/types";
import AppShell from "@/components/AppShell";
import Segmented from "@/components/Segmented";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: "Gần nhất", value: "distance" },
  { label: "Đánh giá", value: "rating" },
  { label: "Giá thấp", value: "price" },
];

const PRICE_OPTIONS: { label: string; value: PriceLevel }[] = [
  { label: "₫", value: 1 },
  { label: "₫₫", value: 2 },
  { label: "₫₫₫", value: 3 },
  { label: "₫₫₫₫", value: 4 },
];

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const {
    prefs,
    setRadius,
    setSortMode,
    setMaxPrice,
    toggleTag,
    clearTags,
    requestGeolocation,
    useDemoLocation,
    isDemoLocation,
    locationStatus,
    resetHistory,
    likedIds,
    hiddenIds,
    dataSource,
    setDataSource,
  } = useFoodSwipeStore();

  return (
    <AppShell>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-muted">Tinh chỉnh trải nghiệm lướt</p>
      </header>

      <div className="space-y-5">
        {/* Giao diện */}
        <Section title="Giao diện">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Chế độ tối</p>
              <p className="text-sm text-muted">
                Đang dùng: {theme === "dark" ? "Tối" : "Sáng"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              onClick={toggleTheme}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                theme === "dark" ? "bg-accent" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                  theme === "dark" ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </Section>

        {/* Nguồn dữ liệu */}
        <Section title="Nguồn dữ liệu quán">
          <Segmented<DataSource>
            aria-label="Nguồn dữ liệu"
            options={[
              { label: "🛰️ Quán thật", value: "live" },
              { label: "🧪 Demo", value: "demo" },
            ]}
            value={dataSource}
            onChange={setDataSource}
          />
          <p className="mt-2 text-sm text-muted">
            {dataSource === "live"
              ? "Lấy quán ăn thật quanh bạn từ OpenStreetMap theo vị trí GPS."
              : "Dùng dữ liệu mẫu (16 quán Sài Gòn) để xem demo ở mọi nơi."}
          </p>
        </Section>

        {/* Bán kính */}
        <Section title="Bán kính tìm kiếm">
          <Segmented<RadiusKm>
            aria-label="Bán kính"
            options={RADIUS_OPTIONS.map((r) => ({ label: `${r} km`, value: r }))}
            value={prefs.radiusKm}
            onChange={setRadius}
          />
        </Section>

        {/* Sắp xếp */}
        <Section title="Sắp xếp">
          <Segmented<SortMode>
            aria-label="Sắp xếp"
            options={SORT_OPTIONS}
            value={prefs.sortMode}
            onChange={setSortMode}
          />
        </Section>

        {/* Mức giá tối đa */}
        <Section title="Mức giá tối đa">
          <Segmented<PriceLevel>
            aria-label="Mức giá tối đa"
            options={PRICE_OPTIONS}
            value={prefs.maxPrice}
            onChange={setMaxPrice}
          />
        </Section>

        {/* Lọc theo món */}
        <Section title="Lọc theo món">
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const active = prefs.activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface-2 text-muted",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {prefs.activeTags.length > 0 && (
            <button
              type="button"
              onClick={clearTags}
              className="mt-3 text-sm font-medium text-accent"
            >
              Xoá bộ lọc món ({prefs.activeTags.length})
            </button>
          )}
        </Section>

        {/* Vị trí */}
        <Section title="Vị trí">
          <p className="mb-3 text-sm text-muted">
            {isDemoLocation
              ? "Đang dùng vị trí demo."
              : locationStatus === "ready"
                ? "Đang dùng vị trí thật."
                : "Chưa có vị trí."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={requestGeolocation}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              📍 Lấy lại vị trí
            </button>
            <button
              type="button"
              onClick={useDemoLocation}
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold"
            >
              🧪 Vị trí demo
            </button>
          </div>
        </Section>

        {/* Lịch sử */}
        <Section title="Lịch sử lướt">
          <p className="mb-3 text-sm text-muted">
            Đã thích {likedIds.length} · Đã bỏ qua {hiddenIds.length}
          </p>
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset toàn bộ lịch sử thích & bỏ qua?")) {
                resetHistory();
              }
            }}
            className="w-full rounded-xl border border-skip/40 bg-skip/10 px-4 py-2.5 text-sm font-semibold text-skip"
          >
            🗑️ Reset lịch sử lướt
          </button>
        </Section>

        <button
          type="button"
          onClick={() => navigate("/swipe")}
          className="w-full rounded-2xl bg-accent px-6 py-3.5 text-base font-bold text-white shadow-card"
        >
          Quay lại lướt 🔥
        </button>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-pop">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

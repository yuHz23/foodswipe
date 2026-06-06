import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodSwipeStore } from "@/stores/useFoodSwipeStore";
import { withDistance } from "@/lib/selectors";
import { formatKm } from "@/utils/geo";
import { priceLabel, handleImgError } from "@/components/FoodCard";
import { openInGoogleMaps } from "@/lib/maps";
import AppShell from "@/components/AppShell";
import Pill from "@/components/Pill";
import { cn } from "@/lib/utils";
import { ALL_TAGS, type FoodTag, type PriceLevel, type RankedPlace } from "@/types";

type Priority = "distance" | "rating" | "open";

type Answers = {
  tags: FoodTag[];
  maxPrice: PriceLevel;
  radiusKm: number;
  priority: Priority;
};

const DEFAULT_ANSWERS: Answers = {
  tags: [],
  maxPrice: 4,
  radiusKm: 5,
  priority: "distance",
};

const PRICE_CHOICES: { label: string; value: PriceLevel }[] = [
  { label: "Rẻ (₫)", value: 1 },
  { label: "Vừa (≤₫₫)", value: 2 },
  { label: "Khá (≤₫₫₫)", value: 3 },
  { label: "Bất kỳ", value: 4 },
];

const RADIUS_CHOICES = [1, 3, 5, 10];

const PRIORITY_CHOICES: { label: string; value: Priority; icon: string }[] = [
  { label: "Gần nhất", value: "distance", icon: "📍" },
  { label: "Đánh giá cao", value: "rating", icon: "⭐" },
  { label: "Đang mở cửa", value: "open", icon: "🟢" },
];

export default function Recommend() {
  const navigate = useNavigate();
  const {
    userLocation,
    locationStatus,
    places,
    placesStatus,
    dataSource,
    loadNearbyPlaces,
  } = useFoodSwipeStore();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [done, setDone] = useState(false);

  // Đảm bảo đã tải quán
  useEffect(() => {
    if (userLocation && places.length === 0 && placesStatus === "idle") {
      void loadNearbyPlaces();
    }
  }, [userLocation, places.length, placesStatus, loadNearbyPlaces]);

  const results = useMemo<RankedPlace[]>(() => {
    if (!userLocation) return [];
    let list = withDistance(places, userLocation).filter(
      (p) => p.distanceKm <= answers.radiusKm,
    );
    if (answers.tags.length > 0) {
      list = list.filter((p) =>
        answers.tags.some((t) => p.tags.includes(t)),
      );
    }
    list = list.filter(
      (p) => p.priceLevel === null || p.priceLevel <= answers.maxPrice,
    );
    if (answers.priority === "open") {
      list = list.filter((p) => p.openNow !== false);
    }

    const sorted = [...list].sort((a, b) => {
      if (answers.priority === "rating")
        return (b.rating ?? 0) - (a.rating ?? 0) || a.distanceKm - b.distanceKm;
      if (answers.priority === "open") {
        const ao = a.openNow === true ? 0 : 1;
        const bo = b.openNow === true ? 0 : 1;
        return ao - bo || a.distanceKm - b.distanceKm;
      }
      return a.distanceKm - b.distanceKm;
    });
    return sorted.slice(0, 5);
  }, [places, userLocation, answers]);

  // Chưa có vị trí
  if (!userLocation || locationStatus !== "ready") {
    return (
      <AppShell>
        <Header />
        <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center">
          <span className="text-5xl">📍</span>
          <p className="mt-4 text-sm text-muted">
            Cần vị trí của bạn để gợi ý quán gần. Hãy thiết lập vị trí trước.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
          >
            Thiết lập vị trí
          </button>
        </div>
      </AppShell>
    );
  }

  const toggleTag = (tag: FoodTag) =>
    setAnswers((a) => ({
      ...a,
      tags: a.tags.includes(tag)
        ? a.tags.filter((t) => t !== tag)
        : [...a.tags, tag],
    }));

  const reset = () => {
    setAnswers(DEFAULT_ANSWERS);
    setStep(0);
    setDone(false);
  };

  // Màn kết quả
  if (done) {
    return (
      <AppShell>
        <Header />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm text-muted">
            {results.length > 0
              ? `${results.length} gợi ý cho bạn`
              : "Chưa tìm được quán hợp"}
          </p>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-accent"
          >
            ↺ Hỏi lại
          </button>
        </div>

        {placesStatus === "loading" && places.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted">
            Đang tải quán quanh bạn…
          </p>
        ) : results.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center">
            <span className="text-5xl">🤷</span>
            <p className="mt-4 text-sm text-muted">
              Không có quán khớp tiêu chí. Thử nới bán kính / ngân sách hoặc bỏ
              bớt loại món rồi hỏi lại.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {results.map((p, i) => (
              <li key={p.id} className="animate-fade-in">
                <button
                  type="button"
                  onClick={() => navigate(`/detail/${p.id}`)}
                  className="relative block h-60 w-full overflow-hidden rounded-3xl text-left"
                >
                  {i === 0 && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-pop">
                      🏆 Gợi ý hàng đầu
                    </span>
                  )}
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => handleImgError(e, p.id)}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h3 className="font-display text-xl font-semibold">
                      {p.name}
                    </h3>
                    <p className="text-sm text-white/80">{p.cuisine}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">
                        📍 {formatKm(p.distanceKm)}
                      </span>
                      {p.rating !== null && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">
                          ⭐ {p.rating.toFixed(1)}
                        </span>
                      )}
                      {p.openNow !== null && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">
                          {p.openNow ? "🟢 Đang mở" : "🔴 Đã đóng"}
                        </span>
                      )}
                      {p.priceLevel !== null && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">
                          {priceLabel(p.priceLevel)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openInGoogleMaps(p)}
                  className="mt-2 text-sm font-medium text-accent"
                >
                  🗺️ Xem trên Google Maps
                </button>
              </li>
            ))}
          </ul>
        )}
      </AppShell>
    );
  }

  // Các câu hỏi
  const STEPS = [
    {
      title: "Bạn đang thèm món gì?",
      hint: "Chọn vài loại (hoặc bỏ trống = bất kỳ).",
      render: () => (
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => {
            const active = answers.tags.includes(tag);
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
      ),
    },
    {
      title: "Ngân sách của bạn?",
      hint: "Lọc theo mức giá tối đa.",
      render: () => (
        <ChoiceGrid
          choices={PRICE_CHOICES}
          value={answers.maxPrice}
          onPick={(v) => setAnswers((a) => ({ ...a, maxPrice: v }))}
        />
      ),
    },
    {
      title: "Đi xa được bao nhiêu?",
      hint: "Bán kính tìm quán.",
      render: () => (
        <ChoiceGrid
          choices={RADIUS_CHOICES.map((r) => ({ label: `${r} km`, value: r }))}
          value={answers.radiusKm}
          onPick={(v) => setAnswers((a) => ({ ...a, radiusKm: v }))}
        />
      ),
    },
    {
      title: "Ưu tiên điều gì nhất?",
      hint: "Cách sắp xếp gợi ý.",
      render: () => (
        <ChoiceGrid
          choices={PRIORITY_CHOICES.map((c) => ({
            label: `${c.icon} ${c.label}`,
            value: c.value,
          }))}
          value={answers.priority}
          onPick={(v) => setAnswers((a) => ({ ...a, priority: v }))}
        />
      ),
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AppShell>
      <Header />

      {/* Tiến trình */}
      <div className="mt-1 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-accent" : "bg-border",
            )}
          />
        ))}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Câu {step + 1}/{STEPS.length}
          {dataSource === "demo" && " · dữ liệu demo"}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">
          {current.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{current.hint}</p>
        <div className="mt-5">{current.render()}</div>
      </div>

      {/* Điều hướng */}
      <div className="mt-8 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold"
          >
            ← Lùi
          </button>
        )}
        <button
          type="button"
          onClick={() => (isLast ? setDone(true) : setStep((s) => s + 1))}
          className="flex-1 rounded-2xl bg-accent px-6 py-3.5 text-base font-bold text-white shadow-card"
        >
          {isLast ? "Xem gợi ý 💡" : "Tiếp →"}
        </button>
      </div>
    </AppShell>
  );
}

function Header() {
  return (
    <header className="mb-3">
      <Pill variant="accent">💡 Gợi ý cho bạn</Pill>
      <h1 className="mt-3 font-display text-2xl font-bold">
        Không biết ăn gì?
      </h1>
    </header>
  );
}

function ChoiceGrid<T extends string | number>({
  choices,
  value,
  onPick,
}: {
  choices: { label: string; value: T }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {choices.map((c) => {
        const active = c.value === value;
        return (
          <button
            key={String(c.value)}
            type="button"
            onClick={() => onPick(c.value)}
            className={cn(
              "rounded-2xl border px-4 py-3.5 text-sm font-semibold transition",
              active
                ? "border-accent bg-accent text-white shadow-pop"
                : "border-border bg-surface text-text",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

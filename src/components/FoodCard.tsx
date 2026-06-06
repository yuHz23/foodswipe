import type { SyntheticEvent } from "react";
import type { FoodPlace, PriceLevel } from "@/types";
import { formatKm } from "@/utils/geo";
import { cn } from "@/lib/utils";
import { fallbackPhoto } from "@/lib/foodPhotos";
import Pill from "./Pill";

/** Đổi sang ảnh dự phòng nếu ảnh chính lỗi (chỉ 1 lần, tránh lặp) */
export function handleImgError(
  e: SyntheticEvent<HTMLImageElement>,
  seed: string,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = fallbackPhoto(seed);
}

type FoodCardProps = {
  place: FoodPlace;
  distanceKm?: number;
  className?: string;
  /** Ẩn phần text overlay (vd preview thẻ phía sau) */
  compact?: boolean;
};

export function priceLabel(level: PriceLevel | null): string {
  return level ? "₫".repeat(level) : "";
}

export default function FoodCard({
  place,
  distanceKm,
  className,
  compact = false,
}: FoodCardProps) {
  return (
    <article
      className={cn(
        "relative h-full w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-card",
        className,
      )}
    >
      {/* Ảnh */}
      <img
        src={place.photoUrl}
        alt={place.name}
        loading="lazy"
        draggable={false}
        onError={(e) => handleImgError(e, place.id)}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />
      {/* Lớp phủ gradient để chữ dễ đọc */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

      {/* Hàng pill phía trên */}
      <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-4">
        {typeof distanceKm === "number" && (
          <Pill variant="accent" className="bg-accent/90 text-white">
            📍 {formatKm(distanceKm)}
          </Pill>
        )}
        {place.rating !== null && (
          <Pill className="bg-black/45 text-white border-white/15">
            ⭐ {place.rating.toFixed(1)}
          </Pill>
        )}
        {place.openNow !== null && (
          <Pill
            className={cn(
              "border-white/15",
              place.openNow
                ? "bg-like/80 text-white"
                : "bg-black/45 text-white/80",
            )}
          >
            {place.openNow ? "Đang mở" : "Đã đóng"}
          </Pill>
        )}
      </div>

      {/* Nội dung dưới */}
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {place.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
            {place.priceLevel !== null && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
                {priceLabel(place.priceLevel)}
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight">
            {place.name}
          </h2>
          <p className="mt-0.5 text-sm text-white/80">{place.cuisine}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-white/75">
            {place.description}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-white/65">
            <span aria-hidden>📌</span>
            {place.address}
          </p>
        </div>
      )}
    </article>
  );
}

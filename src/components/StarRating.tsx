import { cn } from "@/lib/utils";

type StarRatingProps = {
  /** 0..5 (có thể lẻ để hiển thị nửa sao) */
  value: number;
  size?: number;
  /** Cho phép bấm chọn sao */
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
};

/**
 * Sao đánh giá: chế độ hiển thị (đổ màu theo % cho nửa sao) hoặc tương tác
 * (bấm 1..5 sao).
 */
export default function StarRating({
  value,
  size = 18,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  if (interactive) {
    return (
      <div className={cn("inline-flex gap-1", className)} role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n <= Math.round(value)}
            aria-label={`${n} sao`}
            onClick={() => onChange?.(n)}
            className="leading-none transition-transform active:scale-90"
            style={{ fontSize: size }}
          >
            <span
              className={n <= value ? "text-accent-2" : "text-border"}
            >
              ★
            </span>
          </button>
        ))}
      </div>
    );
  }

  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span
      className={cn("relative inline-block leading-none", className)}
      style={{ fontSize: size }}
      aria-label={`${value.toFixed(1)} trên 5 sao`}
    >
      <span className="whitespace-nowrap text-border">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden whitespace-nowrap text-accent-2"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}

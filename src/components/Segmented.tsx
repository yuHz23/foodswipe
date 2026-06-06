import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string | number> = {
  label: string;
  value: T;
};

type SegmentedProps<T extends string | number> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
};

/** Segmented control generic cho string/number (chọn radius, sort,...) */
export default function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full gap-1 rounded-2xl border border-border bg-surface p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-accent text-white shadow-pop"
                : "text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

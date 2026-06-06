import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { RankedPlace } from "@/types";
import FoodCard from "./FoodCard";
import { cn } from "@/lib/utils";

export type SwipeDirection = "like" | "skip";

export type SwipeCardHandle = {
  /** Kích hoạt swipe bằng nút bấm */
  swipe: (dir: SwipeDirection) => void;
};

type SwipeCardProps = {
  place: RankedPlace;
  /** Có nhận tương tác kéo không (chỉ thẻ trên cùng) */
  active: boolean;
  onSwiped: (dir: SwipeDirection, place: RankedPlace) => void;
  /** Mở chi tiết khi tap (không kéo) */
  onTap?: (place: RankedPlace) => void;
};

const THRESHOLD = 110; // px để quyết định swipe
const FLY_OUT = 600; // px bay ra khỏi màn hình

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { place, active, onSwiped, onTap },
  ref,
) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [flying, setFlying] = useState(false);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const flyOut = (dir: SwipeDirection) => {
    setFlying(true);
    setDx(dir === "like" ? FLY_OUT : -FLY_OUT);
    setDy(-40);
    window.setTimeout(() => onSwiped(dir, place), 220);
  };

  useImperativeHandle(ref, () => ({ swipe: flyOut }), [place]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!active || flying) return;
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const nx = e.clientX - start.current.x;
    const ny = e.clientY - start.current.y;
    if (Math.abs(nx) > 6 || Math.abs(ny) > 6) moved.current = true;
    setDx(nx);
    setDy(ny);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;

    if (dx > THRESHOLD) {
      flyOut("like");
    } else if (dx < -THRESHOLD) {
      flyOut("skip");
    } else {
      if (!moved.current) onTap?.(place);
      // bật về giữa
      setDx(0);
      setDy(0);
    }
  };

  const rotate = dx / 18;
  const likeOpacity = Math.max(0, Math.min(1, dx / THRESHOLD));
  const skipOpacity = Math.max(0, Math.min(1, -dx / THRESHOLD));

  return (
    <div
      className={cn(
        "absolute inset-0 touch-none",
        active ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      style={{
        transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rotate}deg)`,
        transition: dragging.current
          ? "none"
          : "transform 0.28s cubic-bezier(.2,.8,.2,1)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <FoodCard place={place} distanceKm={place.distanceKm} />

      {/* Tem LIKE / SKIP khi kéo */}
      <div
        className="pointer-events-none absolute left-5 top-20 -rotate-12 rounded-xl border-4 border-like px-3 py-1 text-2xl font-extrabold text-like"
        style={{ opacity: likeOpacity }}
      >
        THÍCH
      </div>
      <div
        className="pointer-events-none absolute right-5 top-20 rotate-12 rounded-xl border-4 border-skip px-3 py-1 text-2xl font-extrabold text-skip"
        style={{ opacity: skipOpacity }}
      >
        BỎ QUA
      </div>
    </div>
  );
});

export default SwipeCard;

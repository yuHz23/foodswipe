import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import type { RankedPlace } from "@/types";
import SwipeCard, {
  type SwipeCardHandle,
  type SwipeDirection,
} from "./SwipeCard";
import FoodCard from "./FoodCard";

export type SwipeDeckHandle = {
  swipeTop: (dir: SwipeDirection) => void;
};

type SwipeDeckProps = {
  /** Danh sách thẻ còn lại, thẻ index 0 là trên cùng */
  cards: RankedPlace[];
  onSwiped: (dir: SwipeDirection, place: RankedPlace) => void;
  onTap?: (place: RankedPlace) => void;
};

/** Deck xếp chồng: thẻ top tương tác được + tối đa 2 thẻ preview phía sau */
const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(
  function SwipeDeck({ cards, onSwiped, onTap }, ref) {
    const topRef = useRef<SwipeCardHandle>(null);

    useImperativeHandle(ref, () => ({
      swipeTop: (dir) => topRef.current?.swipe(dir),
    }));

    // Reset không cần thiết; key đảm bảo remount đúng thẻ
    useEffect(() => {}, [cards.length]);

    const visible = cards.slice(0, 3);

    return (
      <div className="relative h-full w-full">
        {visible
          .map((place, i) => {
            const isTop = i === 0;
            // Thẻ sau lùi xuống + thu nhỏ nhẹ
            const scale = 1 - i * 0.04;
            const translateY = i * 14;

            if (isTop) {
              return (
                <SwipeCard
                  ref={topRef}
                  key={place.id}
                  place={place}
                  active
                  onSwiped={onSwiped}
                  onTap={onTap}
                />
              );
            }

            return (
              <div
                key={place.id}
                className="absolute inset-0"
                style={{
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  zIndex: -i,
                  filter: "brightness(0.85)",
                }}
              >
                <FoodCard place={place} compact />
              </div>
            );
          })
          // Vẽ thẻ sau trước để thẻ top nằm trên cùng
          .reverse()}
      </div>
    );
  },
);

export default SwipeDeck;

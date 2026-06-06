# 🍜 FoodSwipe

> 🌐 **Live demo:** https://foodswipe-blush.vercel.app — auto-deploy từ GitHub qua Vercel.

Web app **"lướt như Tinder"** để khám phá món & quán ăn quanh bạn theo bán kính 5/10/15/20 km.
MVP chạy **thuần frontend**: dữ liệu mock trong app, tính khoảng cách bằng Haversine, lưu trạng thái vào `localStorage` qua Zustand persist.

## Stack
- React 18 + TypeScript + Vite
- React Router v6
- Tailwind CSS (theme cam–đỏ qua CSS variables, có dark/light)
- Zustand (+ persist middleware)
- Vitest (unit test cho `utils/geo`)

## Chạy dev
```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts
| Lệnh | Việc |
|------|------|
| `npm run dev` | chạy dev server |
| `npm run build` | type-check + build production (`dist/`) |
| `npm run preview` | preview bản build |
| `npm run check` | type-check (tsc --noEmit) |
| `npm run test` | chạy unit test (Vitest) |

## Tính năng
- **Onboarding**: xin vị trí thật / dùng vị trí demo (Quận 1, TP.HCM) / nhập toạ độ tay; chọn bán kính.
- **Lướt**: quẹt thẻ (Pointer Events) trái=bỏ qua, phải=thích; nút Like/Skip; phím tắt ←/→; deck xếp chồng 3 thẻ.
- **Chi tiết**: ảnh lớn, thông số, toggle thích, mở Google Maps theo toạ độ.
- **Đã thích**: danh sách quán đã lưu, mở chi tiết/maps, bỏ thích.
- **Cài đặt**: bán kính, sắp xếp (gần nhất/đánh giá/giá), **lọc theo món (tag)**, **mức giá tối đa**, **dark mode**, lấy lại vị trí, reset lịch sử.

## Cấu trúc
```
src/
├─ components/   # AppShell, BottomNav, FoodCard, Pill, Segmented, SwipeCard, SwipeDeck
├─ data/         # foodPlaces.ts (mock dataset)
├─ hooks/        # useTheme.ts (light/dark + persist)
├─ lib/          # utils.ts (cn), selectors.ts (buildDeck/sort/filter)
├─ pages/        # Onboarding, Swipe, Detail, Liked, Settings
├─ stores/       # useFoodSwipeStore.ts (zustand + persist)
├─ utils/        # geo.ts (Haversine, formatKm, clamp, guard) + geo.test.ts
└─ types.ts      # FoodPlace, RadiusKm, UserPrefs, ...
```

## localStorage keys
- `foodsSwipe.store` — state Zustand (vị trí, prefs, likedIds, hiddenIds)
- `foodsSwipe.theme` — light/dark

> Ảnh quán dùng `picsum.photos` theo seed để demo có hình ổn định. Thay bằng ảnh thật khi tích hợp dữ liệu quán thực tế.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  DataSource,
  FoodPlace,
  FoodTag,
  LatLng,
  LocationStatus,
  PriceLevel,
  RadiusKm,
  SortMode,
  UserPrefs,
} from "@/types";
import { clampLatLng, isLatLng } from "@/utils/geo";
import { DEMO_LOCATION, FOOD_PLACES } from "@/data/foodPlaces";
import { fetchNearbyPlaces } from "@/lib/overpass";

type FoodSwipeState = {
  // Vị trí
  userLocation: LatLng | null;
  locationStatus: LocationStatus;
  locationError: string | null;
  isDemoLocation: boolean;

  // Nguồn dữ liệu quán
  dataSource: DataSource;
  places: FoodPlace[];
  placesStatus: LocationStatus;
  placesError: string | null;
  /** Cache mọi quán đã gặp (để Detail/Liked tra cứu theo id) */
  placeCache: Record<string, FoodPlace>;
  /** Đánh dấu quán đã thử lấy ảnh thật (tránh gọi API trùng) */
  photoFetched: Record<string, boolean>;

  // Tuỳ chọn
  prefs: UserPrefs;

  // Lịch sử lướt
  likedIds: string[];
  hiddenIds: string[];

  // Actions — vị trí
  requestGeolocation: () => void;
  useDemoLocation: () => void;
  setManualLocation: (loc: LatLng) => void;

  // Actions — dữ liệu
  setDataSource: (src: DataSource) => void;
  loadNearbyPlaces: () => Promise<void>;
  ensureVenuePhoto: (place: FoodPlace) => Promise<void>;

  // Actions — prefs
  setRadius: (radiusKm: RadiusKm) => void;
  setSortMode: (sortMode: SortMode) => void;
  toggleTag: (tag: FoodTag) => void;
  clearTags: () => void;
  setMaxPrice: (maxPrice: PriceLevel) => void;

  // Actions — lịch sử
  like: (id: string) => void;
  unlike: (id: string) => void;
  hide: (id: string) => void;
  resetHistory: () => void;
};

const DEFAULT_PREFS: UserPrefs = {
  radiusKm: 10,
  sortMode: "distance",
  activeTags: [],
  maxPrice: 4,
};

const addUnique = (list: string[], id: string): string[] =>
  list.includes(id) ? list : [...list, id];

const indexById = (places: FoodPlace[]): Record<string, FoodPlace> =>
  Object.fromEntries(places.map((p) => [p.id, p]));

/** AbortController cho lần fetch đang chạy (ngoài state để không re-render) */
let inFlight: AbortController | null = null;

export const useFoodSwipeStore = create<FoodSwipeState>()(
  persist(
    (set, get) => ({
      userLocation: null,
      locationStatus: "idle",
      locationError: null,
      isDemoLocation: false,

      dataSource: "live",
      places: [],
      placesStatus: "idle",
      placesError: null,
      placeCache: {},
      photoFetched: {},

      prefs: DEFAULT_PREFS,

      likedIds: [],
      hiddenIds: [],

      requestGeolocation: () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          set({
            locationStatus: "error",
            locationError: "Trình duyệt không hỗ trợ định vị.",
          });
          return;
        }
        set({ locationStatus: "loading", locationError: null });
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            set({
              userLocation: clampLatLng({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
              locationStatus: "ready",
              locationError: null,
              isDemoLocation: false,
            });
            void get().loadNearbyPlaces();
          },
          (err) => {
            const denied = err.code === err.PERMISSION_DENIED;
            set({
              locationStatus: denied ? "denied" : "error",
              locationError: denied
                ? "Bạn đã từ chối quyền vị trí. Có thể dùng vị trí demo hoặc nhập tay."
                : "Không lấy được vị trí. Thử lại hoặc dùng vị trí demo.",
            });
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      },

      useDemoLocation: () => {
        set({
          userLocation: DEMO_LOCATION,
          locationStatus: "ready",
          locationError: null,
          isDemoLocation: true,
        });
        void get().loadNearbyPlaces();
      },

      setManualLocation: (loc) => {
        if (!isLatLng(loc)) return;
        set({
          userLocation: clampLatLng(loc),
          locationStatus: "ready",
          locationError: null,
          isDemoLocation: false,
        });
        void get().loadNearbyPlaces();
      },

      setDataSource: (src) => {
        set({ dataSource: src });
        void get().loadNearbyPlaces();
      },

      loadNearbyPlaces: async () => {
        const { userLocation, dataSource, prefs, placeCache } = get();
        if (!userLocation) return;

        // Chế độ demo: dùng dataset mock Sài Gòn
        if (dataSource === "demo") {
          set({
            places: FOOD_PLACES,
            placesStatus: "ready",
            placesError: null,
            placeCache: { ...placeCache, ...indexById(FOOD_PLACES) },
          });
          return;
        }

        // Chế độ live: gọi Overpass
        inFlight?.abort();
        const controller = new AbortController();
        inFlight = controller;

        set({ placesStatus: "loading", placesError: null });
        try {
          const { places } = await fetchNearbyPlaces(
            userLocation,
            prefs.radiusKm,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          set((s) => ({
            places,
            placesStatus: "ready",
            placesError: null,
            placeCache: { ...s.placeCache, ...indexById(places) },
          }));
        } catch (err) {
          if (controller.signal.aborted) return;
          set({
            placesStatus: "error",
            placesError:
              "Không tải được quán quanh bạn (mạng/Overpass lỗi). Thử lại hoặc dùng dữ liệu demo.",
          });
        } finally {
          if (inFlight === controller) inFlight = null;
        }
      },

      ensureVenuePhoto: async (place) => {
        if (typeof window === "undefined") return;
        if (get().photoFetched[place.id]) return;
        // đánh dấu trước để không gọi trùng khi nhiều card render
        set((s) => ({
          photoFetched: { ...s.photoFetched, [place.id]: true },
        }));
        try {
          const url = new URL("/api/venue-photo", window.location.origin);
          url.searchParams.set("lat", String(place.location.lat));
          url.searchParams.set("lng", String(place.location.lng));
          url.searchParams.set("name", place.name);
          const res = await fetch(url.toString());
          if (!res.ok) return;
          const data = (await res.json()) as { photo: string | null };
          if (!data.photo) return;
          const photo = data.photo;
          set((s) => ({
            places: s.places.map((p) =>
              p.id === place.id ? { ...p, photoUrl: photo } : p,
            ),
            placeCache: {
              ...s.placeCache,
              [place.id]: {
                ...(s.placeCache[place.id] ?? place),
                photoUrl: photo,
              },
            },
          }));
        } catch {
          // im lặng — giữ ảnh hiện tại (LoremFlickr)
        }
      },

      setRadius: (radiusKm) => {
        set((s) => ({ prefs: { ...s.prefs, radiusKm } }));
        void get().loadNearbyPlaces();
      },
      setSortMode: (sortMode) =>
        set((s) => ({ prefs: { ...s.prefs, sortMode } })),
      toggleTag: (tag) =>
        set((s) => {
          const active = s.prefs.activeTags.includes(tag)
            ? s.prefs.activeTags.filter((t) => t !== tag)
            : [...s.prefs.activeTags, tag];
          return { prefs: { ...s.prefs, activeTags: active } };
        }),
      clearTags: () => set((s) => ({ prefs: { ...s.prefs, activeTags: [] } })),
      setMaxPrice: (maxPrice) =>
        set((s) => ({ prefs: { ...s.prefs, maxPrice } })),

      like: (id) =>
        set((s) => ({
          likedIds: addUnique(s.likedIds, id),
          hiddenIds: s.hiddenIds.filter((h) => h !== id),
        })),
      unlike: (id) =>
        set((s) => ({ likedIds: s.likedIds.filter((l) => l !== id) })),
      hide: (id) =>
        set((s) => ({
          hiddenIds: addUnique(s.hiddenIds, id),
          likedIds: s.likedIds.filter((l) => l !== id),
        })),
      resetHistory: () => set({ likedIds: [], hiddenIds: [] }),
    }),
    {
      name: "foodsSwipe.store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userLocation: s.userLocation,
        isDemoLocation: s.isDemoLocation,
        dataSource: s.dataSource,
        placeCache: s.placeCache,
        prefs: s.prefs,
        likedIds: s.likedIds,
        hiddenIds: s.hiddenIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.userLocation) {
          state.locationStatus = "ready";
        }
      },
      version: 2,
    },
  ),
);

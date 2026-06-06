import { describe, it, expect } from "vitest";
import { haversineKm, formatKm, clampLatLng, isLatLng } from "./geo";

describe("haversineKm", () => {
  it("trả về 0 cho hai điểm trùng nhau", () => {
    const p = { lat: 10.762622, lng: 106.660172 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("tính đúng khoảng cách HCM ↔ Hà Nội (~1140 km)", () => {
    const hcm = { lat: 10.7626, lng: 106.6602 };
    const hanoi = { lat: 21.0278, lng: 105.8342 };
    const d = haversineKm(hcm, hanoi);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1180);
  });

  it("đối xứng: d(a,b) === d(b,a)", () => {
    const a = { lat: 10.77, lng: 106.69 };
    const b = { lat: 10.8, lng: 106.7 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe("formatKm", () => {
  it("hiển thị mét khi < 1 km", () => {
    expect(formatKm(0.45)).toBe("450 m");
  });
  it("hiển thị 1 chữ số thập phân khi < 10 km", () => {
    expect(formatKm(2.345)).toBe("2.3 km");
  });
  it("làm tròn km khi >= 10 km", () => {
    expect(formatKm(12.6)).toBe("13 km");
  });
  it("trả về '—' với giá trị không hợp lệ", () => {
    expect(formatKm(NaN)).toBe("—");
    expect(formatKm(-5)).toBe("—");
  });
});

describe("clampLatLng", () => {
  it("clamp lat vượt biên", () => {
    expect(clampLatLng({ lat: 120, lng: 0 }).lat).toBe(90);
    expect(clampLatLng({ lat: -120, lng: 0 }).lat).toBe(-90);
  });
  it("wrap lng vượt 180", () => {
    expect(clampLatLng({ lat: 0, lng: 190 }).lng).toBeCloseTo(-170, 9);
    expect(clampLatLng({ lat: 0, lng: -190 }).lng).toBeCloseTo(170, 9);
  });
});

describe("isLatLng", () => {
  it("nhận object hợp lệ", () => {
    expect(isLatLng({ lat: 10, lng: 106 })).toBe(true);
  });
  it("từ chối giá trị sai", () => {
    expect(isLatLng(null)).toBe(false);
    expect(isLatLng({ lat: "10", lng: 106 })).toBe(false);
    expect(isLatLng({ lat: NaN, lng: 106 })).toBe(false);
    expect(isLatLng(undefined)).toBe(false);
  });
});

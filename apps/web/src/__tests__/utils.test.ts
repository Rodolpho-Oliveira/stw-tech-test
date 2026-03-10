/**
 * Tests for utility functions.
 */
import { formatUptime, formatRelativeTime } from "@/lib/utils";

describe("formatUptime", () => {
  it("formats seconds-only duration", () => {
    expect(formatUptime(45)).toBe("0m");
  });

  it("formats minutes-only duration", () => {
    expect(formatUptime(600)).toBe("10m");
  });

  it("formats hours and minutes", () => {
    expect(formatUptime(19380)).toBe("5h 23m");
  });

  it("handles exactly 1 hour", () => {
    expect(formatUptime(3600)).toBe("1h 0m");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'agora' for very recent times", () => {
    const recent = new Date(Date.now() - 30_000); // 30 seconds ago
    expect(formatRelativeTime(recent)).toBe("agora");
  });

  it("returns minutes for recent times", () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(fiveMin)).toBe("5min atrás");
  });
});

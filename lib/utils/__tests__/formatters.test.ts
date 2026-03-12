import { formatBytes, formatNumber } from "@/lib/utils/formatters";
import { describe, expect, it } from "vitest";

describe("formatNumber", () => {
  it("should return fallback for undefined input", () => {
    expect(formatNumber(undefined)).toBe("-");
  });

  it("should return fallback for null input", () => {
    expect(formatNumber(null as any)).toBe("-");
  });

  it("should return fallback for 0", () => {
    expect(formatNumber(0)).toBe("-");
  });

  it("should format thousands with k suffix", () => {
    expect(formatNumber(1000)).toBe("1K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(10000)).toBe("10K");
    expect(formatNumber(999999)).toBe("1M");
  });

  it("should format millions with M suffix", () => {
    expect(formatNumber(1000000)).toBe("1M");
    expect(formatNumber(2500000)).toBe("2.5M");
    expect(formatNumber(10000000)).toBe("10M");
  });

  it("should format billions with B suffix", () => {
    expect(formatNumber(1000000000)).toBe("1B");
    expect(formatNumber(5500000000)).toBe("5.5B");
  });
});

describe("formatBytes", () => {
  it("should return '0 B' for 0", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("should return '0 B' for undefined", () => {
    expect(formatBytes(undefined as any)).toBe("0 B");
  });

  it("should format bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("should format kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10240)).toBe("10 KB");
  });

  it("should format megabytes", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
    expect(formatBytes(10485760)).toBe("10 MB");
  });

  it("should format gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
    expect(formatBytes(1610612736)).toBe("1.5 GB");
  });

  it("should accept custom decimal places", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB");
    expect(formatBytes(1536, 3)).toBe("1.5 KB");
    expect(formatBytes(1536, 1)).toBe("1.5 KB");
  });

  it("should handle negative decimals as 0", () => {
    expect(formatBytes(1536, -1)).toBe("2 KB");
  });
});

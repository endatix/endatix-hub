import {
  formatBytes,
  formatNumber,
  formatCurrency,
  formatDecimalNumber,
  formatDateTime,
  formatValue,
  parseNumberValue,
} from "@/lib/utils/formatters";
import { describe, expect, it } from "vitest";

describe("formatNumber", () => {
  it("should return fallback for 0", () => {
    expect(formatNumber(0)).toBe("-");
  });

  it("should return fallback for null", () => {
    expect(formatNumber(null as any)).toBe("-");
  });

  it("should return fallback for undefined", () => {
    expect(formatNumber(undefined as any)).toBe("-");
  });

  it("should format negative numbers", () => {
    expect(formatNumber(-1000)).toBe("-1K");
    expect(formatNumber(-500)).toBe("-500");
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

describe("formatCurrency", () => {
  it("should format as USD by default", () => {
    expect(formatCurrency(100)).toBe("$100.00");
    expect(formatCurrency(1234.56)).toContain("1,234.56");
  });

  it("should format with specified currency", () => {
    expect(formatCurrency(100, "EUR")).toContain("100");
    expect(formatCurrency(100, "GBP")).toContain("£100");
  });
});

describe("formatDecimalNumber", () => {
  it("should format with 2 decimal places by default", () => {
    expect(formatDecimalNumber(1234.567)).toBe("1,234.57");
    expect(formatDecimalNumber(100)).toBe("100.00");
  });

  it("should format with specified decimal places", () => {
    expect(formatDecimalNumber(1234.567, 0)).toBe("1,235");
    expect(formatDecimalNumber(1234.567, 3)).toBe("1,234.567");
  });
});

describe("formatDateTime", () => {
  it("should return empty string for empty string", () => {
    expect(formatDateTime("")).toBe("");
  });

  it("should return empty string for null", () => {
    expect(formatDateTime(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(formatDateTime(undefined)).toBe("");
  });

  it("should format date string with short style by default", () => {
    expect(formatDateTime("2024-01-15")).toBe("1/15/24");
  });

  it("should format with specified date style", () => {
    const short = formatDateTime("2024-01-15", "short");
    const medium = formatDateTime("2024-01-15", "medium");
    const long = formatDateTime("2024-01-15", "long");
    const full = formatDateTime("2024-01-15", "full");

    expect(short).toBe("1/15/24");
    expect(medium).toBe("Jan 15, 2024");
    expect(long).toContain("January");
    expect(full).toContain("Monday");
  });

  it("should return string value for invalid date", () => {
    expect(formatDateTime("invalid")).toBe("invalid");
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

describe("formatValue", () => {
  it("should return empty string for null", () => {
    expect(formatValue(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(formatValue(undefined)).toBe("");
  });

  it("should return the string unchanged", () => {
    expect(formatValue("hello")).toBe("hello");
    expect(formatValue("")).toBe("");
  });

  it("should convert numbers to string", () => {
    expect(formatValue(42)).toBe(formatNumber(42));
    expect(formatValue(1000)).toBe(formatNumber(1000));
    expect(formatValue(0)).toBe(formatNumber(0));
    expect(formatValue(-3.14)).toBe(formatNumber(-3.14));
  });

  it("should convert booleans to string", () => {
    expect(formatValue(true)).toBe("true");
    expect(formatValue(false)).toBe("false");
  });

  it("should format empty arrays", () => {
    expect(formatValue([])).toBe("[]");
  });

  it("should format arrays with items", () => {
    expect(formatValue([1, 2, 3])).toBe("[3 items]");
    expect(formatValue(["a", "b"])).toBe("[2 items]");
  });

  it("should format empty objects", () => {
    expect(formatValue({})).toBe("{}");
  });

  it("should format objects with keys", () => {
    expect(formatValue({ key: "value" })).toBe("{1 keys}");
    expect(formatValue({ a: 1, b: 2 })).toBe("{2 keys}");
  });

  it("should handle nested objects and arrays", () => {
    expect(formatValue({ items: [1, 2] })).toBe("{1 keys}");
    expect(formatValue([{ a: 1 }])).toBe("[1 items]");
  });

  it("should handle unknown types with String()", () => {
    expect(formatValue(Symbol("test"))).toBe("Symbol(test)");
  });

  it("should handle functions", () => {
    const myFunc = () => {};
    expect(formatValue(myFunc)).toBe("[function]");
  });
});

describe("parseNumberValue", () => {
  it("should return number as-is", () => {
    expect(parseNumberValue(42)).toBe(42);
    expect(parseNumberValue(0)).toBe(0);
    expect(parseNumberValue(-3.14)).toBe(-3.14);
  });

  it("should parse valid number strings", () => {
    expect(parseNumberValue("42")).toBe(42);
    expect(parseNumberValue("3.14")).toBe(3.14);
    expect(parseNumberValue("-100")).toBe(-100);
  });

  it("should return null for invalid number strings", () => {
    expect(parseNumberValue("abc")).toBeNull();
  });

  it("should return null for empty string (Number behavior)", () => {
    expect(parseNumberValue("")).toBeNull();
  });

  it("should return null for whitespace string", () => {
    expect(parseNumberValue("   ")).toBeNull();
  });

  it("should convert booleans to numbers", () => {
    expect(parseNumberValue(true)).toBe(1);
    expect(parseNumberValue(false)).toBe(0);
  });

  it("should return null for objects and arrays", () => {
    expect(parseNumberValue({})).toBeNull();
    expect(parseNumberValue([])).toBeNull();
    expect(parseNumberValue([1, 2])).toBeNull();
  });

  it("should return null for undefined", () => {
    expect(parseNumberValue(undefined)).toBeNull();
  });
});

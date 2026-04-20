import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  smartFormat,
} from "../formatters";

describe("formatCurrency", () => {
  it("formats number as USD by default", () => {
    expect(formatCurrency([100])).toBe("$100.00");
    expect(formatCurrency([1234.56])).toBe("$1,234.56");
  });

  it("formats with specified currency code", () => {
    expect(formatCurrency([100, "EUR"])).toContain("100");
    expect(formatCurrency([100, "GBP"])).toContain("£100");
  });

  it("formats with specified locale", () => {
    expect(formatCurrency([100, "USD", "de-DE"])).toContain("100");
  });

  it("returns original value for invalid input", () => {
    expect(formatCurrency([])).toBe("");
    expect(formatCurrency(["invalid"])).toBe("invalid");
    expect(formatCurrency([null])).toBe("null");
  });
});

describe("formatNumber", () => {
  it("formats number with 2 decimal places by default", () => {
    expect(formatNumber([1234.567])).toBe("1,234.57");
    expect(formatNumber([100])).toBe("100.00");
  });

  it("formats with specified decimal places", () => {
    expect(formatNumber([1234.567, 0])).toBe("1,235");
    expect(formatNumber([1234.567, 3])).toBe("1,234.567");
  });

  it("formats with specified locale", () => {
    expect(formatNumber([1234.56, 2, "de-DE"])).toBeTruthy();
  });

  it("returns original value for invalid input", () => {
    expect(formatNumber([])).toBe("");
    expect(formatNumber(["invalid"])).toBe("invalid");
  });
});

describe("formatDate", () => {
  it("formats date string with short date style by default", () => {
    const result = formatDate(["2024-01-15"]);
    expect(result).toBeTruthy();
    expect(result).toContain("15");
  });

  it("formats with specified date style", () => {
    const short = formatDate(["2024-01-15", "short"]);
    const medium = formatDate(["2024-01-15", "medium"]);
    const long = formatDate(["2024-01-15", "long"]);
    const full = formatDate(["2024-01-15", "full"]);

    expect(short).toBeTruthy();
    expect(medium).toBeTruthy();
    expect(long).toBeTruthy();
    expect(full).toBeTruthy();
  });

  it("formats with specified locale", () => {
    const result = formatDate(["2024-01-15", "medium", "de-DE"]);
    expect(result).toBeTruthy();
  });

  it("returns original value for invalid date", () => {
    expect(formatDate([])).toBe("");
    expect(formatDate(["invalid-date"])).toBe("invalid-date");
  });
});

describe("smartFormat", () => {
  it("formats as currency with format type", () => {
    expect(smartFormat([100, "currency"])).toContain("100");
    expect(smartFormat([100, "currency", "EUR"])).toContain("€100");
  });

  it("formats as percent", () => {
    expect(smartFormat([0.5, "percent"])).toBe("50%");
    expect(smartFormat([1, "percent"])).toBe("100%");
  });

  it("formats as date", () => {
    const result = smartFormat(["2024-01-15", "date"]);
    expect(result).toBeTruthy();
  });

  it("formats as number", () => {
    expect(smartFormat([1234.567, "number"])).toBe("1,234.57");
    expect(smartFormat([1234.567, "number", 0])).toBe("1,235");
  });

  it("returns string value for unknown format type", () => {
    expect(smartFormat([100, "unknown"])).toBe("100");
  });

  it("handles empty params", () => {
    expect(smartFormat([])).toBe("");
    expect(smartFormat([100])).toBe("100");
  });
});

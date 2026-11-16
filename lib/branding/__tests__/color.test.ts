import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  fromOklch,
  parseCssColor,
  toHex,
  toOklch,
} from "../color";

describe("parseCssColor", () => {
  it.each([
    ["#0b6b5d", "#0b6b5d"],
    ["#FFF", "#ffffff"],
    ["rgb(11 107 93)", "#0b6b5d"],
    ["rgb(11, 107, 93)", "#0b6b5d"],
    ["hsl(216 100% 41%)", "#0054d1"],
    ["hsl(216, 100%, 41%)", "#0054d1"],
    ["oklch(0.6 0 0)", "#808080"],
  ])("reads %s", (input, hex) => {
    // Act
    const color = parseCssColor(input);

    // Assert
    expect(color && toHex(color)).toBe(hex);
  });

  it.each(["blue-ish", "#12", "rgb(1 2)", "hsl(1 2 3 4 5)", "url(x)", ""])(
    "rejects %j",
    (input) => {
      // Act
      const color = parseCssColor(input);

      // Assert
      expect(color).toBeNull();
    },
  );
});

describe("OKLCH conversion", () => {
  it.each(["#0b6b5d", "#4fd1b8", "#0052d1", "#ffffff", "#000000"])(
    "round-trips %s",
    (hex) => {
      // Arrange
      const color = parseCssColor(hex)!;

      // Act
      const back = toHex(fromOklch(toOklch(color)));

      // Assert
      expect(back).toBe(hex);
    },
  );

  it("maps an out-of-gamut colour back into sRGB with its hue", () => {
    // Arrange
    const vivid = { l: 0.7, c: 0.4, h: 150 };

    // Act
    const mapped = toOklch(fromOklch(vivid));

    // Assert
    expect(mapped.c).toBeLessThan(0.4);
    expect(Math.abs(mapped.h - 150)).toBeLessThan(3);
  });
});

describe("contrastRatio", () => {
  it.each([
    ["#ffffff", "#000000", 21],
    ["#ffffff", "#ffffff", 1],
    ["#0052d1", "#ffffff", 6.71],
  ])("of %s on %s is %d", (a, b, ratio) => {
    // Act
    const result = contrastRatio(parseCssColor(a)!, parseCssColor(b)!);

    // Assert
    expect(result).toBeCloseTo(ratio, 1);
  });
});

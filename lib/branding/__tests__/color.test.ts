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
    ["oklch(60% 0 0)", "#808080"],
    ["oklch(60% 0 0deg)", "#808080"],
    ["oklch(0.6 0% 0)", "#808080"],
    ["hsl(216deg 100% 41%)", "#0054d1"],
    ["rgb(100% 0% 0%)", "#ff0000"],
  ])("reads %s", (input, hex) => {
    // Act
    const color = parseCssColor(input);

    // Assert
    expect(color && toHex(color)).toBe(hex);
  });

  it.each([
    "blue-ish",
    "#12",
    "rgb(1 2)",
    "hsl(1 2 3 4 5)",
    "url(x)",
    "",
    "hsl(216% 100% 41%)",
    "oklch(60% 0.15 250%)",
    "oklch(0.6deg 0.1 250)",
  ])("rejects %j", (input) => {
    // Act
    const color = parseCssColor(input);

    // Assert
    expect(color).toBeNull();
  });
});

it("reads oklch chroma percent as a share of 0.4", () => {
  // Act
  const fromPercent = parseCssColor("oklch(60% 40% 250)")!;
  const fromNumber = parseCssColor("oklch(0.6 0.16 250)")!;

  // Assert
  expect(toHex(fromPercent)).toBe(toHex(fromNumber));
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

describe("parseCssColor, CSS syntax details", () => {
  it.each([
    ["rgb(100% 0 0)", "#ff0000"],
    ["rgb(255 0% 0)", "#ff0000"],
    ["oklch(0.5 -0.05 0)", "#636363"],
    ["hsl(216 100 41)", "#0054d1"],
    ["hsla(216, 100%, 41%)", "#0054d1"],
    ["hsla(216deg, 100%, 41%)", "#0054d1"],
    ["hsla(216 100 41)", "#0054d1"],
  ])("reads %s as CSS does", (input, hex) => {
    // Act
    const color = parseCssColor(input);

    // Assert
    expect(color && toHex(color)).toBe(hex);
  });

  it.each([
    "rgb(255, 0 0)",
    "rgb(255 0, 0)",
    "hsl(216, 100% 41%)",
    "oklch(0.6, 0.1, 250)",
    "oklcha(0.6 0.1 250)",
    "OKLCHA(0.6 0.1 250)",
    "hsl(216,100,41)",
    "hsl(216, 100%, 41)",
    "hsla(216, 100, 41%)",
    "rgb(100%, 0, 0)",
    `hsl(1${"0".repeat(400)}.5 100% 50%)`,
  ])("rejects %s", (input) => {
    // Act
    const color = parseCssColor(input);

    // Assert
    expect(color).toBeNull();
  });

  const around = (space: string) =>
    `${space}hsl(216${space}100%${space}41%)${space}`;
  const between = (space: string) => `hsl(216,${space}100%,${space}41%)`;

  it.each([" ", "\t", "\n", "\r", "\f"])(
    "reads ASCII whitespace %j around and between arguments",
    (space) => {
      // Act
      const spaced = parseCssColor(around(space));
      const commas = parseCssColor(between(space));

      // Assert
      expect(spaced && toHex(spaced)).toBe("#0054d1");
      expect(commas && toHex(commas)).toBe("#0054d1");
    },
  );

  /** Every space JavaScript's `trim()` and `\s` take beyond the five CSS ones. */
  const NON_ASCII_SPACES = [
    0xfeff,
    0x00a0,
    0x000b,
    0x1680,
    ...Array.from({ length: 11 }, (_, i) => 0x2000 + i),
    0x2028,
    0x2029,
    0x202f,
    0x205f,
    0x3000,
  ].map((codePoint) => [
    `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
    String.fromCodePoint(codePoint),
  ]);

  it.each(NON_ASCII_SPACES)(
    "rejects %s before, between or after arguments",
    (_, space) => {
      // Act
      const results = [
        parseCssColor(`${space}hsl(216 100% 41%)`),
        parseCssColor(`hsl(216 100% 41%)${space}`),
        parseCssColor(`hsl(216${space}100%${space}41%)`),
        parseCssColor(between(space)),
        parseCssColor(`${space}#0054d1`),
      ];

      // Assert
      expect(results).toEqual([null, null, null, null, null]);
    },
  );

  it("rejects a long integer followed by junk without retrying its digits", () => {
    // Arrange: an ambiguous number pattern splits the digits every way first.
    const input = `rgb(${"1".repeat(30_000)}x 0 0)`;

    // Act
    const color = parseCssColor(input);

    // Assert
    expect(color).toBeNull();
  });
});

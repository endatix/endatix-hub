import { describe, expect, it } from "vitest";
import { contrastRatio, parseCssColor, toOklch } from "../color";
import {
  BRAND_TOKENS,
  checkBrandContrast,
  derivePalette,
  toStylesheet,
  type BrandColor,
} from "../palette";

function color(primary: string, onDark?: string): BrandColor {
  return {
    primary: parseCssColor(primary)!,
    onDark: onDark ? parseCssColor(onDark)! : null,
  };
}

/** The hand-tuned values in app/globals.css `:root` / `.dark`. */
const BUILT_IN = {
  light: {
    "--primary": "hsl(216 100% 41%)",
    "--primary-dim": "hsl(216 100% 37%)",
    "--sidebar-ring": "hsl(217.2 91.2% 59.8%)",
    "--chart-1": "hsl(211, 100%, 78%)",
    "--chart-2": "hsl(216, 100%, 58%)",
    "--chart-3": "hsl(221, 97%, 53%)",
    "--chart-4": "hsl(216, 100%, 41%)",
    "--chart-5": "hsl(227, 76%, 41%)",
  },
  dark: {
    "--primary": "#b4c5ff",
    "--primary-dim": "#a0b6ff",
    "--chart-4": "hsl(218, 85%, 60%)",
  },
} as const;

/** OKLab distance; under 0.02 is not visible side by side. */
function distance(a: string, b: string): number {
  const x = toOklch(parseCssColor(a)!);
  const y = toOklch(parseCssColor(b)!);
  const [ax, ay] = [
    x.c * Math.cos((x.h * Math.PI) / 180),
    x.c * Math.sin((x.h * Math.PI) / 180),
  ];
  const [bx, by] = [
    y.c * Math.cos((y.h * Math.PI) / 180),
    y.c * Math.sin((y.h * Math.PI) / 180),
  ];
  return Math.hypot(x.l - y.l, ax - bx, ay - by);
}

describe("derivePalette", () => {
  it("emits every primary-family token in both modes", () => {
    // Act
    const palette = derivePalette(color("#0b6b5d"));

    // Assert
    expect(Object.keys(palette.light)).toEqual([...BRAND_TOKENS]);
    expect(Object.keys(palette.dark)).toEqual([...BRAND_TOKENS]);
  });

  it("uses the brand colour as written for the light primary, ring and endatix", () => {
    // Act
    const { light } = derivePalette(color("#0b6b5d"));

    // Assert
    expect(light["--primary"]).toBe("#0b6b5d");
    expect(light["--ring"]).toBe("#0b6b5d");
    expect(light["--endatix"]).toBe("#0b6b5d");
  });

  it("uses primary-on-dark as written in dark mode when the pack sets it", () => {
    // Act
    const { dark } = derivePalette(color("#0b6b5d", "#4fd1b8"));

    // Assert
    expect(dark["--primary"]).toBe("#4fd1b8");
  });

  it("lifts the primary for dark mode when the pack sets no dark colour", () => {
    // Arrange
    const brandHue = toOklch(parseCssColor("#0b6b5d")!).h;
    const builtInShift =
      toOklch(parseCssColor(BUILT_IN.dark["--primary"])!).h -
      toOklch(parseCssColor(BUILT_IN.light["--primary"])!).h;

    // Act
    const dark = toOklch(
      parseCssColor(derivePalette(color("#0b6b5d")).dark["--primary"])!,
    );

    // Assert
    expect(dark.l).toBeGreaterThan(0.75);
    expect(Math.abs(dark.h - (brandHue + builtInShift))).toBeLessThan(3);
  });

  it.each([
    ["light", "--primary"],
    ["light", "--primary-dim"],
    ["light", "--sidebar-ring"],
    ["light", "--chart-1"],
    ["light", "--chart-2"],
    ["light", "--chart-3"],
    ["light", "--chart-5"],
    ["dark", "--primary"],
    ["dark", "--primary-dim"],
    ["dark", "--chart-4"],
  ] as const)(
    "reproduces the built-in %s %s from the built-in colour",
    (mode, token) => {
      // Act
      const palette = derivePalette(color(BUILT_IN.light["--primary"]));

      // Assert
      const expected = (BUILT_IN[mode] as Record<string, string>)[token];
      expect(distance(palette[mode][token], expected)).toBeLessThan(0.02);
    },
  );

  it("derives the dark tokens from primary-on-dark's hue when the pack sets it", () => {
    // Arrange
    const onDark = "#ffb347";
    const shift =
      toOklch(parseCssColor(BUILT_IN.dark["--chart-4"])!).h -
      toOklch(parseCssColor(BUILT_IN.dark["--primary"])!).h;

    // Act
    const chart = toOklch(
      parseCssColor(derivePalette(color("#0b6b5d", onDark)).dark["--chart-4"])!,
    );

    // Assert
    const expected = toOklch(parseCssColor(onDark)!).h + shift;
    expect(Math.abs(chart.h - expected)).toBeLessThan(3);
  });

  it.each([
    "#0b6b5d",
    "#ffd400",
    "#7c7c7c",
    "#ff0000",
    "#00ff00",
    "#1a1a1a",
    "#f5f5f5",
    "hsl(280 90% 55%)",
  ])("gives %s a foreground with WCAG 4.5:1 in both modes", (primary) => {
    // Act
    const palette = derivePalette(color(primary));

    // Assert
    for (const mode of ["light", "dark"] as const) {
      const ratio = contrastRatio(
        parseCssColor(palette[mode]["--primary"])!,
        parseCssColor(palette[mode]["--primary-foreground"])!,
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/** `--background` in app/globals.css, the page a focus ring sits on. */
const PAGE = { light: "#ffffff", dark: "#000f21" } as const;
const MODES = ["light", "dark"] as const;

const ratio = (a: string, b: string) =>
  contrastRatio(parseCssColor(a)!, parseCssColor(b)!);

function expectReadableStates(palette: ReturnType<typeof derivePalette>) {
  for (const mode of MODES) {
    const tokens = palette[mode];
    expect(
      ratio(tokens["--primary-hover"], tokens["--primary-foreground"]),
      `${mode} hover label`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      ratio(tokens["--focus-ring"], PAGE[mode]),
      `${mode} focus ring`,
    ).toBeGreaterThanOrEqual(3);
  }
}

describe("derivePalette: interactive states", () => {
  it("keeps the hover label and focus ring readable for a pale accent", () => {
    // Act: #747474 passes at rest, but primary/90 on white is 3.85:1 and ring/50 is 1.95:1.
    const palette = derivePalette(color("#747474"));

    // Assert
    expectReadableStates(palette);
  });

  it("keeps the hover label and focus ring readable for a dark accent on the dark page", () => {
    // Act
    const palette = derivePalette(color("#0b6b5d", "#0a1a2a"));

    // Assert
    expectReadableStates(palette);
  });

  it("still shows a hover for a pale accent, stepping the other way", () => {
    // Act
    const { light } = derivePalette(color("#747474"));

    // Assert: as far from the rest colour as the built-in 90% blend would be, but darker.
    expect(distance(light["--primary-hover"], "#747474")).toBeGreaterThan(0.04);
    expect(ratio(light["--primary-hover"], PAGE.light)).toBeGreaterThan(
      ratio("#747474", PAGE.light),
    );
  });

  it("keeps the built-in hover look when the accent already reads", () => {
    // Act
    const { light } = derivePalette(color("#0b6b5d"));

    // Assert: primary at 90% over the white page, as bg-primary/90 draws it.
    expect(distance(light["--primary-hover"], "#237a6d")).toBeLessThan(0.02);
  });

  it("keeps the soft ring when the accent's half-tone already reaches 3:1", () => {
    // Act
    const { dark } = derivePalette(color("#0b6b5d", "#b4c5ff"));

    // Assert: #b4c5ff at 50% over the dark page, as ring-ring/50 draws it.
    expect(distance(dark["--focus-ring"], "#5a6a90")).toBeLessThan(0.02);
  });

  it("holds both minimums for every accent the validator accepts", () => {
    // Arrange: any parseable colour is accepted, so sweep hue, lightness and chroma.
    const accents: BrandColor[] = [];
    for (let h = 0; h < 360; h += 30)
      for (let l = 0; l <= 100; l += 10)
        for (const s of [0, 50, 100]) {
          accents.push(color(`hsl(${h} ${s}% ${l}%)`));
          accents.push(color("#0b6b5d", `hsl(${h} ${s}% ${l}%)`));
        }

    // Act / Assert
    for (const accent of accents) expectReadableStates(derivePalette(accent));
  });
});

describe("toStylesheet", () => {
  it("is empty when the brand sets no colour", () => {
    // Act
    const css = toStylesheet(null);

    // Assert
    expect(css).toBe("");
  });

  it("scopes light to html:root and dark to html.dark", () => {
    // Act
    const css = toStylesheet(color("#0b6b5d", "#4fd1b8"));

    // Assert
    expect(css).toMatch(
      /^html:root\{--primary:#0b6b5d;.*\}html\.dark\{--primary:#4fd1b8;.*\}$/,
    );
  });
});

describe("checkBrandContrast", () => {
  it("reports a ratio just under the minimum as under it", () => {
    // Act: #959595 on white is 2.995:1.
    const [finding] = checkBrandContrast(color("#959595"));

    // Assert
    expect(finding.ratio).toBe(2.99);
    expect(finding.ratio).toBeLessThan(finding.minimum);
  });

  it("passes the built-in colour", () => {
    // Act
    const findings = checkBrandContrast(color("hsl(216 100% 41%)"));

    // Assert
    expect(findings).toEqual([]);
  });

  it("flags a light primary that fades into the white page", () => {
    // Act
    const findings = checkBrandContrast(color("#ffd400"));

    // Assert
    expect(findings).toEqual([
      expect.objectContaining({ mode: "light", token: "tokens.color.primary" }),
    ]);
  });

  it("flags a primary-on-dark that fades into the dark page", () => {
    // Act
    const findings = checkBrandContrast(color("#0b6b5d", "#0a1a2a"));

    // Assert
    expect(findings).toEqual([
      expect.objectContaining({
        mode: "dark",
        token: "tokens.color.primary-on-dark",
      }),
    ]);
  });
});

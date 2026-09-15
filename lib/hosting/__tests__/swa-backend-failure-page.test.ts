import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `public/swa-backend-failure.html` is a standalone branded timeout page.
 *
 * Azure Static Web Apps only allows responseOverrides for 400, 401, 403, and 404
 * (https://aka.ms/static-web-apps-configuration). A 500 rewrite fails deploy
 * validation, so this file is not wired in staticwebapp.config.json.
 *
 * Hub still returns HTML 502 from the export-pdf route when it can finish
 * inside the ~40s budget. The SWA edge 500 (`Backend call failure`) cannot be
 * customized.
 *
 * Everything is inlined: it cannot depend on the Next.js backend.
 */

const REPO_ROOT = path.resolve(__dirname, "../../..");

const PAGE = "public/swa-backend-failure.html";
const SWA_CONFIG = "staticwebapp.config.json";
const GLOBALS = "app/globals.css";
const THEME_PROVIDER = "components/providers/theme-provider.tsx";

const read = (relativePath: string) =>
  readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

/** Page-local: the app has no shadow token for this to track. */
const PAGE_LOCAL_TOKENS = new Set(["--shadow"]);

/** Static asset the page HEADs to recover an Azure edge reference. */
const EDGE_PROBE_ASSET = "assets/icons/icon.svg";

/** The only origins the page may name. Anything else breaks self-containment. */
const ALLOWED_EXTERNAL_ORIGINS = [
  "https://docs.endatix.com",
  "http://www.w3.org/2000/svg", // SVG namespace, never fetched
];

/** Body of the first `selector { … }` block, respecting nested braces. */
function blockBody(css: string, selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `${selector} not found`).toBeGreaterThan(-1);

  const open = css.indexOf("{", start);
  let depth = 0;

  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") {
      depth += 1;
    } else if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(open + 1, index);
      }
    }
  }

  throw new Error(`Unterminated block for ${selector}`);
}

/**
 * The same colour is written `hsl(214, 88%, 97%)` in one file and
 * `hsl(214 88% 97%)` in another. Compare meaning, not punctuation.
 */
const normalize = (value: string) =>
  value.replace(/,/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

function customProperties(body: string): Map<string, string> {
  const properties = new Map<string, string>();

  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    properties.set(name, normalize(value));
  }

  return properties;
}

/**
 * Prose naming an API is not a use of it — this file's own comments explain which
 * globals the page must avoid. Strip comments before scanning for real calls.
 */
const withoutComments = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

const page = read(PAGE);
const globals = read(GLOBALS);
const themeProvider = read(THEME_PROVIDER);

const appTokens = {
  light: customProperties(blockBody(globals, ":root {")),
  dark: customProperties(blockBody(globals, ".dark {")),
};

const pageTokens = {
  light: customProperties(blockBody(page, ":root {")),
  dark: customProperties(blockBody(page, ":root.dark {")),
};

describe("SWA backend-failure page: theme contract", () => {
  /**
   * next-themes persists under `storageKey`, default "theme". The page reads that key
   * directly. A custom key anywhere in the provider would silently desync the two.
   */
  it("reads the localStorage key next-themes actually writes", () => {
    expect(themeProvider).not.toMatch(/storageKey/);
    expect(page).toContain('localStorage.getItem("theme")');
  });

  it("falls back to the same default theme as the provider", () => {
    const providerDefault = themeProvider.match(
      /defaultTheme\s*=\s*THEME_OPTIONS\.(\w+)/,
    )?.[1];
    expect(providerDefault, "provider defaultTheme").toBeDefined();

    const providerValue = themeProvider.match(
      new RegExp(`${providerDefault}:\\s*"(\\w+)"`),
    )?.[1];
    expect(providerValue, "resolved defaultTheme value").toBeDefined();

    const pageDefault = page.match(/var theme = "(\w+)";/)?.[1];
    expect(pageDefault).toBe(providerValue);
  });

  /** attribute="class" means the theme rides on a class, not a data-attribute. */
  it("applies the theme the same way the provider does", () => {
    expect(themeProvider).toMatch(/attribute\s*=\s*"class"/);
    expect(page).toContain("document.documentElement.classList.add(theme)");
  });

  it("resolves the system setting against the OS preference", () => {
    expect(page).toContain('theme === "system"');
    expect(page).toContain("(prefers-color-scheme: dark)");
  });
});

describe("SWA backend-failure page: design tokens", () => {
  it.each(["light", "dark"] as const)(
    "matches every %s token it copies from globals.css",
    (theme) => {
      const tracked = [...pageTokens[theme]].filter(
        ([name]) => !PAGE_LOCAL_TOKENS.has(name),
      );

      expect(tracked.length).toBeGreaterThan(0);

      for (const [name, value] of tracked) {
        expect(
          appTokens[theme].has(name),
          `${name} missing from ${GLOBALS}`,
        ).toBe(true);
        expect(value, `${name} (${theme}) drifted from ${GLOBALS}`).toBe(
          appTokens[theme].get(name),
        );
      }
    },
  );

  /** A token added to one theme only would leave the other rendering a broken value. */
  it("declares the same tokens in both themes", () => {
    expect([...pageTokens.light.keys()].sort()).toEqual(
      [...pageTokens.dark.keys()].sort(),
    );
  });

  /** The no-JS fallback must stay a copy of the dark block, not a third palette. */
  it("keeps the prefers-color-scheme fallback identical to the dark block", () => {
    const fallback = customProperties(
      blockBody(page, ":root:not(.light):not(.dark) {"),
    );

    expect(Object.fromEntries(fallback)).toEqual(
      Object.fromEntries(pageTokens.dark),
    );
  });
});

describe("SWA backend-failure page: self-containment", () => {
  it("is not wired as a 500 override (SWA deploy rejects that status)", () => {
    const config = read(SWA_CONFIG);

    expect(config).not.toMatch(/"500"/);
    expect(config).not.toContain("responseOverrides");
  });
  /**
   * The backend is what just failed. Any runtime dependency is a dependency on the
   * broken thing, so the page must render from its own bytes alone.
   */
  it("pulls in no external stylesheet, script, or import", () => {
    expect(page).not.toMatch(/<link\b/i);
    expect(page).not.toMatch(/<script[^>]+\bsrc=/i);
    expect(page).not.toMatch(/@import\b/);
    expect(page).not.toMatch(/<img\b/i);
  });

  it("names no origin beyond the documented allowlist", () => {
    const origins = [...page.matchAll(/https?:\/\/[^"'\s)]+/g)].map(
      ([url]) => url,
    );

    for (const origin of origins) {
      expect(
        ALLOWED_EXTERNAL_ORIGINS.some((allowed) => origin.startsWith(allowed)),
        `unexpected external reference: ${origin}`,
      ).toBe(true);
    }
  });

  it("probes an asset that exists", () => {
    expect(page).toContain(`/${EDGE_PROBE_ASSET}`);
    expect(existsSync(path.join(REPO_ROOT, "public", EDGE_PROBE_ASSET))).toBe(
      true,
    );
  });
});

describe("SWA backend-failure page: diagnostics", () => {
  /**
   * Endatix share and export links carry access tokens in the query string, and the
   * details panel exists to be copied into a support thread. It may report the path
   * and never the query.
   */
  it("never reads the query string into the copyable panel", () => {
    const code = withoutComments(page);

    expect(code).toContain("window.location.pathname");
    expect(code).not.toContain("location.search");
    expect(code).not.toContain("location.href");
  });

  it("stays noindex", () => {
    expect(page).toMatch(/<meta name="robots" content="noindex/);
  });

  /** Auto-reload would pile requests onto a backend already failing to keep up. */
  it("retries only on an explicit click", () => {
    const code = withoutComments(page);

    expect(code).not.toMatch(/setTimeout\([^)]*location\.reload/);
    expect(code).not.toMatch(/<meta[^>]+http-equiv="refresh"/i);
    expect(code).toContain('retry.addEventListener("click"');
  });
});

// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandProvider } from "../brand-provider";
import { useBrand } from "../client";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "../layers";
import { BrandPackSchema } from "../schema";

const builtIn = mergeBrand([BUILT_IN_LAYER]);
function brandWith(primary: string) {
  return mergeBrand([
    packLayer(
      BrandPackSchema.parse({
        version: 1,
        name: "Example Forms",
        tokens: { color: { primary: { $type: "color", $value: primary } } },
      }),
      (file) => `/brand/${file}`,
    ),
    BUILT_IN_LAYER,
  ]);
}
const branded = brandWith("#0b6b5d");

/** The `--primary` the document's brand styles leave in force, last rule winning. */
function activePrimary(): string | null {
  const rules = [...document.querySelectorAll("style")]
    .map((style) =>
      /html:root\{--primary:(#[0-9a-f]{6})/.exec(style.textContent ?? ""),
    )
    .filter((match) => match !== null);
  return rules.at(-1)?.[1] ?? null;
}

/** A whole document, so the test sees where the brand style lands. */
function page(brand = builtIn) {
  return renderToString(
    <html>
      {createElement("head")}
      <body>
        <BrandProvider brand={brand}>
          <p>content</p>
        </BrandProvider>
      </body>
    </html>,
  );
}

describe("BrandProvider", () => {
  it("renders no style element for the built-in brand", () => {
    // Act
    const html = page();

    // Assert
    expect(html).not.toContain("<style");
    expect(html).toContain("<p>content</p>");
  });

  it("server-renders the brand stylesheet ahead of the content", () => {
    // Act
    const html = page(branded);

    // Assert
    const style = html.indexOf(
      `<style data-endatix-brand="">${branded.stylesheet}</style>`,
    );
    expect(style).toBeGreaterThan(-1);
    expect(style).toBeLessThan(html.indexOf("<p>content</p>"));
  });
});

describe("useBrand", () => {
  it("returns the provided brand", () => {
    // Arrange
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BrandProvider brand={branded}>{children}</BrandProvider>
    );

    // Act
    const { result } = renderHook(() => useBrand(), { wrapper });

    // Assert
    expect(result.current.name).toBe("Example Forms");
  });

  it("throws outside AppProvider", () => {
    // Act
    const run = () => renderHook(() => useBrand());

    // Assert
    expect(run).toThrow(/AppProvider/);
  });
});

describe("BrandProvider after a refresh", () => {
  it.each([
    ["branded, then the built-in brand", ["#0b6b5d", null], null],
    [
      "accent A, then B, then A again",
      ["#0b6b5d", "#7a1f8f", "#0b6b5d"],
      "#0b6b5d",
    ],
  ])("leaves the current brand in force: %s", async (_, steps, expected) => {
    // Arrange
    const container = document.body.appendChild(document.createElement("div"));
    const root = createRoot(container);

    // Act
    for (const primary of steps) {
      const brand = primary ? brandWith(primary) : builtIn;
      await act(async () =>
        root.render(
          <BrandProvider brand={brand}>
            <p>content</p>
          </BrandProvider>,
        ),
      );
    }

    // Assert
    expect(activePrimary()).toBe(expected);
    await act(async () => root.unmount());
    document.head.querySelectorAll("style").forEach((style) => style.remove());
    container.remove();
  });
});

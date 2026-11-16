// @vitest-environment jsdom
/* eslint-disable @next/next/no-head-element -- a whole document, rendered to check where React hoists the brand style */
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandProvider } from "../brand-provider";
import { useBrand } from "../client";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "../layers";
import { BrandPackSchema } from "../schema";

const builtIn = mergeBrand([BUILT_IN_LAYER]);
const branded = mergeBrand([
  packLayer(
    BrandPackSchema.parse({
      version: 1,
      name: "Example Forms",
      tokens: { color: { primary: { $type: "color", $value: "#0b6b5d" } } },
    }),
    (file) => `/brand/${file}`,
  ),
  BUILT_IN_LAYER,
]);

function page(brand = builtIn) {
  return renderToString(
    <html>
      <head />
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

  it("server-renders the brand stylesheet into the head", () => {
    // Act
    const html = page(branded);

    // Assert
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    expect(head).toContain(`<style data-precedence="default"`);
    expect(head).toContain(branded.stylesheet);
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

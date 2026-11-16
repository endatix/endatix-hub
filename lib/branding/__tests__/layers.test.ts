import { describe, expect, it } from "vitest";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "../layers";
import { BrandPackSchema, type BrandPack } from "../schema";

const assetUrl = (file: string) => `/brand/${file}?v=abc`;

function pack(fields: Partial<BrandPack> = {}): BrandPack {
  return BrandPackSchema.parse({
    version: 1,
    name: "Example Forms",
    ...fields,
  });
}

describe("mergeBrand", () => {
  it("is the built-in brand with an empty stylesheet when only the built-in layer is present", () => {
    // Act
    const brand = mergeBrand([BUILT_IN_LAYER]);

    // Assert
    expect(brand.name).toBe("Endatix Hub");
    expect(brand.logo.light).toBe(
      "/assets/icons/endatix-logo-wordmark-blue.svg",
    );
    expect(brand.icon).toBe("/assets/icons/icon.svg");
    expect(brand.poweredBy).toBeNull();
    expect(brand.stylesheet).toBe("");
  });

  it("takes the pack's fields and keeps built-in values for what it leaves out", () => {
    // Arrange
    const layer = packLayer(
      pack({ links: { docs: "https://docs.example.com" } }),
      assetUrl,
    );

    // Act
    const brand = mergeBrand([layer, BUILT_IN_LAYER]);

    // Assert
    expect(brand.name).toBe("Example Forms");
    expect(brand.links.docs).toBe("https://docs.example.com");
    expect(brand.links.website).toBe("https://endatix.com");
    expect(brand.personas).toEqual(mergeBrand([BUILT_IN_LAYER]).personas);
    expect(brand.icon).toBe("/assets/icons/icon.svg");
  });

  it("resolves pack files to URLs", () => {
    // Arrange
    const layer = packLayer(
      pack({ assets: { icon: "icon.svg", ogImage: "og.jpg" } }),
      assetUrl,
    );

    // Act
    const brand = mergeBrand([layer, BUILT_IN_LAYER]);

    // Assert
    expect(brand.icon).toBe("/brand/icon.svg?v=abc");
    expect(brand.ogImage).toBe("/brand/og.jpg?v=abc");
  });

  it("takes the logo pair whole, so a light-only pack logo is never paired with the built-in dark one", () => {
    // Arrange
    const layer = packLayer(
      pack({ assets: { logo: { light: "logo.svg" } } }),
      assetUrl,
    );

    // Act
    const brand = mergeBrand([layer, BUILT_IN_LAYER]);

    // Assert
    expect(brand.logo).toEqual({
      light: "/brand/logo.svg?v=abc",
      dark: "/brand/logo.svg?v=abc",
    });
  });

  it("builds the stylesheet from the pack colour", () => {
    // Arrange
    const layer = packLayer(
      pack({
        tokens: { color: { primary: { $type: "color", $value: "#0b6b5d" } } },
      }),
      assetUrl,
    );

    // Act
    const brand = mergeBrand([layer, BUILT_IN_LAYER]);

    // Assert
    expect(brand.stylesheet).toContain("html:root{--primary:#0b6b5d;");
  });

  it("carries the pack's poweredBy choice", () => {
    // Act
    const brand = mergeBrand([
      packLayer(pack({ poweredBy: false }), assetUrl),
      BUILT_IN_LAYER,
    ]);

    // Assert
    expect(brand.poweredBy).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { layoutMetadataFor, titleFor } from "../brand-metadata";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "../layers";
import { BrandPackSchema } from "../schema";

const builtIn = mergeBrand([BUILT_IN_LAYER]);

function packBrand(assets: Record<string, unknown> = {}) {
  return mergeBrand([
    packLayer(
      BrandPackSchema.parse({
        version: 1,
        name: "Example Forms",
        legalName: "Example Ltd.",
        assets,
      }),
      (file) => `/brand/${file}?v=abc`,
    ),
    BUILT_IN_LAYER,
  ]);
}

describe("layoutMetadataFor", () => {
  it("keeps today's Endatix values for the built-in brand", () => {
    // Act
    const metadata = layoutMetadataFor(builtIn);

    // Assert
    expect(metadata).toEqual({
      title: "Endatix Hub",
      applicationName: "Endatix Hub",
      publisher: "Endatix Ltd.",
      icons: {
        icon: [{ url: "/assets/icons/icon.svg", type: "image/svg+xml" }],
      },
    });
  });

  it("gives the pages below a '<page> | <name>' title template", () => {
    // Act
    const metadata = layoutMetadataFor(packBrand(), { titleTemplate: true });

    // Assert
    expect(metadata.title).toEqual({
      default: "Example Forms",
      template: "%s | Example Forms",
    });
  });

  it("gives the pages below the brand's social image", () => {
    // Arrange
    const brand = packBrand({ ogImage: "og.jpg" });

    // Act
    const metadata = layoutMetadataFor(brand, { socialImage: true });

    // Assert
    expect(metadata.openGraph).toEqual({
      images: [{ url: "/brand/og.jpg?v=abc" }],
    });
  });

  it("names no social image when the brand has none", () => {
    // Arrange
    const brand = { ...builtIn, ogImage: null };

    // Act
    const metadata = layoutMetadataFor(brand, { socialImage: true });

    // Assert
    expect(metadata.openGraph).toBeUndefined();
  });

  it("uses the pack's name, legal name and icon", () => {
    // Arrange
    const brand = packBrand({ icon: "icon.png" });

    // Act
    const metadata = layoutMetadataFor(brand);

    // Assert
    expect(metadata.applicationName).toBe("Example Forms");
    expect(metadata.publisher).toBe("Example Ltd.");
    expect(metadata.icons).toEqual({
      icon: [{ url: "/brand/icon.png?v=abc", type: "image/png" }],
    });
  });

  it("leaves the icon type to the browser for an extension it does not know", () => {
    // Arrange
    const brand = { ...builtIn, icon: "/brand/icon?v=abc" };

    // Act
    const metadata = layoutMetadataFor(brand);

    // Assert
    expect(metadata.icons).toEqual({ icon: [{ url: "/brand/icon?v=abc" }] });
  });
});

describe("titleFor", () => {
  it("titles a page '<page> | <name>'", () => {
    expect(titleFor(packBrand(), { page: "Form" }, false)).toBe(
      "Form | Example Forms",
    );
  });

  it("keeps the page's built-in title while no pack applies", () => {
    expect(
      titleFor(builtIn, { page: "Form", builtIn: "Endatix Form" }, true),
    ).toBe("Endatix Form");
  });

  it("brands a page with a built-in title when a pack applies", () => {
    expect(
      titleFor(packBrand(), { page: "Form", builtIn: "Endatix Form" }, false),
    ).toBe("Form | Example Forms");
  });
});

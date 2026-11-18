import { describe, expect, it } from "vitest";
import { metadataFor } from "../brand-metadata";
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

describe("metadataFor", () => {
  it("keeps today's Endatix values for the built-in brand", () => {
    // Act
    const metadata = metadataFor(builtIn);

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

  it("titles a page '<page> | <name>' and describes it for social previews", () => {
    // Act
    const metadata = metadataFor(builtIn, {
      title: "Sign in",
      description: "Sign in the portal.",
    });

    // Assert
    expect(metadata.title).toBe("Sign in | Endatix Hub");
    expect(metadata.description).toBe("Sign in the portal.");
    expect(metadata.openGraph).toEqual({
      description: "Sign in the portal.",
      images: [{ url: "/assets/endatix-og-image.jpg" }],
    });
  });

  it("uses the pack's name, legal name, icon and social image", () => {
    // Arrange
    const brand = packBrand({ icon: "icon.png", ogImage: "og.jpg" });

    // Act
    const metadata = metadataFor(brand, {
      title: "Sign in",
      description: "Sign in the portal.",
    });

    // Assert
    expect(metadata.title).toBe("Sign in | Example Forms");
    expect(metadata.applicationName).toBe("Example Forms");
    expect(metadata.publisher).toBe("Example Ltd.");
    expect(metadata.icons).toEqual({
      icon: [{ url: "/brand/icon.png?v=abc", type: "image/png" }],
    });
    expect(metadata.openGraph).toEqual({
      description: "Sign in the portal.",
      images: [{ url: "/brand/og.jpg?v=abc" }],
    });
  });

  it("leaves the icon type to the browser for an extension it does not know", () => {
    // Arrange
    const brand = { ...builtIn, icon: "/brand/icon?v=abc" };

    // Act
    const metadata = metadataFor(brand);

    // Assert
    expect(metadata.icons).toEqual({ icon: [{ url: "/brand/icon?v=abc" }] });
  });

  it("keeps a page's own title while no pack applies", () => {
    // Act
    const metadata = metadataFor(
      builtIn,
      { title: "Form", builtInTitle: "Endatix Form" },
      { builtIn: true },
    );

    // Assert
    expect(metadata.title).toBe("Endatix Form");
  });

  it("titles a page '<page> | <name>' when a pack applies, even with a built-in title", () => {
    // Act
    const metadata = metadataFor(packBrand(), {
      title: "Form",
      builtInTitle: "Endatix Form",
    });

    // Assert
    expect(metadata.title).toBe("Form | Example Forms");
  });

  it("adds no social preview to a page without a description", () => {
    // Act
    const metadata = metadataFor(builtIn, { title: "Edit Submission" });

    // Assert
    expect(metadata.title).toBe("Edit Submission | Endatix Hub");
    expect(metadata.openGraph).toBeUndefined();
  });

  it("names no social image when the brand has none", () => {
    // Arrange
    const brand = { ...builtIn, ogImage: null };

    // Act
    const metadata = metadataFor(brand, {
      title: "Sign in",
      description: "Sign in the portal.",
    });

    // Assert
    expect(metadata.openGraph).toEqual({ description: "Sign in the portal." });
  });
});

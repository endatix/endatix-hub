import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandProvider } from "../brand-provider";
import { BrandLogo, type BrandLogoProps } from "../brand-logo";
import type { Brand } from "../index";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "../layers";
import { BrandPackSchema } from "../schema";

const builtIn = mergeBrand([BUILT_IN_LAYER]);

function packBrand(assets: Record<string, unknown>) {
  return mergeBrand([
    packLayer(
      BrandPackSchema.parse({ version: 1, name: "Example Forms", assets }),
      (file) => `/brand/${file}?v=abc`,
    ),
    BUILT_IN_LAYER,
  ]);
}

const branded = packBrand({
  logo: { light: "logo-light.svg", dark: "logo-dark.svg" },
  icon: "icon.png",
});

/** Each image as `<src> <alt> <the light/dark class>`. */
function images(brand: Brand, props: BrandLogoProps = {}) {
  const { container } = render(
    <BrandProvider brand={brand}>
      <BrandLogo {...props} />
    </BrandProvider>,
  );
  return [...container.querySelectorAll("img")].map((img) =>
    [
      img.getAttribute("src"),
      img.getAttribute("alt"),
      img.className.includes("dark:hidden") ? "light" : "dark",
    ].join(" "),
  );
}

describe("BrandLogo", () => {
  it("shows the built-in wordmark pair, one per theme", () => {
    expect(images(builtIn)).toEqual([
      "/assets/icons/endatix-logo-wordmark-blue.svg Endatix Hub light",
      "/assets/icons/endatix-logo-wordmark-white.svg Endatix Hub dark",
    ]);
  });

  it("shows the pack's light and dark logos, named after the brand", () => {
    expect(images(branded)).toEqual([
      "/brand/logo-light.svg?v=abc Example Forms light",
      "/brand/logo-dark.svg?v=abc Example Forms dark",
    ]);
  });

  it("keeps the caller's classes on both images", () => {
    // Act
    const { container } = render(
      <BrandProvider brand={builtIn}>
        <BrandLogo className="h-10 w-auto" />
      </BrandProvider>,
    );

    // Assert
    const classes = [...container.querySelectorAll("img")].map(
      (img) => img.className,
    );
    expect(classes).toEqual([
      "h-10 w-auto dark:hidden",
      "hidden h-10 w-auto dark:block",
    ]);
  });

  it("shows the built-in paperclip pair as the icon", () => {
    expect(images(builtIn, { variant: "icon" })).toEqual([
      "/assets/icons/endatix-paperclip-icon-blue.svg  light",
      "/assets/icons/endatix-paperclip-icon-white.svg  dark",
    ]);
  });

  it("shows the pack's one icon in both themes", () => {
    // Act
    const { container } = render(
      <BrandProvider brand={branded}>
        <BrandLogo variant="icon" className="size-8" />
      </BrandProvider>,
    );

    // Assert
    const icons = [...container.querySelectorAll("img")];
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute("src")).toBe("/brand/icon.png?v=abc");
    expect(icons[0].className).toBe("size-8");
  });

  it("shows the built-in sidebar lockup: paperclip and wordmark", () => {
    expect(images(builtIn, { variant: "lockup" })).toEqual([
      "/assets/icons/endatix-paperclip-icon-blue.svg  light",
      "/assets/icons/endatix-paperclip-icon-white.svg  dark",
      "/assets/icons/endatix-wordmark-blue.svg Endatix Hub light",
      "/assets/icons/endatix-wordmark-white.svg Endatix Hub dark",
    ]);
  });

  it("shows the pack's logo pair as the sidebar lockup", () => {
    expect(images(branded, { variant: "lockup" })).toEqual([
      "/brand/logo-light.svg?v=abc Example Forms light",
      "/brand/logo-dark.svg?v=abc Example Forms dark",
    ]);
  });

  it("keeps the built-in logo, and its name, when the pack sets only an icon", () => {
    // Arrange
    const iconOnly = packBrand({ icon: "icon.png" });

    // Act
    const lockup = images(iconOnly, { variant: "lockup" });

    // Assert
    expect(lockup).toEqual([
      "/assets/icons/endatix-logo-wordmark-blue.svg Endatix Hub light",
      "/assets/icons/endatix-logo-wordmark-white.svg Endatix Hub dark",
    ]);
  });
});

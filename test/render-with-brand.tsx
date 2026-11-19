import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { BrandProvider } from "@/lib/branding/brand-provider";
import { BUILT_IN_LAYER, mergeBrand } from "@/lib/branding/layers";

const builtInBrand = mergeBrand([BUILT_IN_LAYER]);

/** What `AppProvider` gives a page: the built-in brand, for components that show `BrandLogo`. */
export function BuiltInBrand({ children }: Readonly<{ children: ReactNode }>) {
  return <BrandProvider brand={builtInBrand}>{children}</BrandProvider>;
}

export function renderWithBrand(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { ...options, wrapper: BuiltInBrand });
}

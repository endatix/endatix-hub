"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Brand } from "./index";

const BrandContext = createContext<Brand | null>(null);

/**
 * Mounted by `AppProvider`. A branded stylesheet is a `<style>` with
 * `precedence`, which React hoists into `<head>` during server rendering, so the
 * first paint already has the brand colour. The built-in brand renders no
 * `<style>` at all, so the page CSS is exactly what ships.
 */
export function BrandProvider({
  brand,
  children,
}: Readonly<{ brand: Brand; children: ReactNode }>) {
  return (
    <BrandContext.Provider value={brand}>
      {brand.stylesheet ? (
        <style
          href={`endatix-brand-${hashOf(brand.stylesheet)}`}
          precedence="default"
        >
          {brand.stylesheet}
        </style>
      ) : null}
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): Brand {
  const brand = useContext(BrandContext);
  if (brand === null)
    throw new Error("useBrand must be used inside AppProvider");
  return brand;
}

/** React dedupes hoisted styles by href, so a changed stylesheet needs a new one. */
function hashOf(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = (hash * 33) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

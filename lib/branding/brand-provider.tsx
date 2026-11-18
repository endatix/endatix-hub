"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Brand } from "./index";

const BrandContext = createContext<Brand | null>(null);

/**
 * Mounted by `AppProvider`. A branded stylesheet is an ordinary `<style>`,
 * server-rendered ahead of the content, so the first paint already has the
 * brand colour. It is not hoisted: React keeps a hoisted (`precedence`) style
 * after its owner unmounts, so a refresh to another brand would leave the old
 * accent in force. The built-in brand renders no `<style>` at all, so the page
 * CSS is exactly what ships.
 */
export function BrandProvider({
  brand,
  children,
}: Readonly<{ brand: Brand; children: ReactNode }>) {
  return (
    <BrandContext.Provider value={brand}>
      {brand.stylesheet ? (
        <style data-endatix-brand="">{brand.stylesheet}</style>
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

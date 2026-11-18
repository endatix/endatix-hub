/**
 * The effective brand: the deployment's brand pack over the built-in Endatix brand.
 * Read it with `getBrand()` (`@/lib/branding/server`) or `useBrand()`
 * (`@/lib/branding/client`). Every URL is resolved, and nothing says which layer
 * a value came from.
 */
export interface Brand {
  /** Product name: titles, metadata, UI copy. */
  readonly name: string;
  readonly legalName: string;
  /** Wordmark URLs. A pack with only a light logo uses it for dark too. */
  readonly logo: { readonly light: string; readonly dark: string };
  readonly icon: string;
  readonly ogImage: string | null;
  /** The pack's links over the built-in ones, key by key. The built-in brand has no privacy or terms link. */
  readonly links: Readonly<Partial<Record<BrandLinkKey, string>>>;
  /** Null: the pack does not say, so `ENDATIX_SHOW_POWERED_BY` decides. */
  readonly poweredBy: boolean | null;
  readonly personas: { readonly assistant: string; readonly bot: string };
  /** Opaque. Only the brand provider renders it; empty for the built-in brand. */
  readonly stylesheet: BrandStylesheet;
}

export type BrandLinkKey = "website" | "docs" | "support" | "privacy" | "terms";

declare const stylesheetBrand: unique symbol;
export type BrandStylesheet = string & { readonly [stylesheetBrand]: true };

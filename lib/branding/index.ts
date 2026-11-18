/**
 * The effective brand: the deployment's brand pack over the built-in Endatix brand.
 * Read it with `getBrand()` (`@/lib/branding/server`) or `useBrand()`
 * (`@/lib/branding/client`). Every URL is resolved, and nothing says which layer
 * a value came from.
 */
export interface Brand {
  /** Product name: titles, metadata, UI copy. */
  readonly name: string;
  /** The name in running text ("About …", "the … API", "… Team"): "Endatix" for the built-in brand, the pack's name otherwise. */
  readonly shortName: string;
  readonly legalName: string;
  /** The sign-in hero headline: "Form Management Platform" for the built-in brand, the pack's name otherwise. */
  readonly tagline: string;
  /** Wordmark URLs. A pack with only a light logo uses it for dark too. */
  readonly logo: { readonly light: string; readonly dark: string };
  readonly icon: string;
  readonly ogImage: string | null;
  /** The pack's links, or with no pack the built-in ones. A link the pack leaves out is absent, never Endatix's. */
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

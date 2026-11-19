import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import {
  layoutMetadataFor,
  titleFor,
  type BrandLayoutOptions,
  type BrandTitle,
} from "./brand-metadata";
import type { Brand } from "./index";
import {
  BUILT_IN_BRAND,
  resolveDeploymentBrand,
} from "./effective-brand.server";

export type { Brand, BrandLinkKey } from "./index";
export type { BrandLayoutOptions, BrandTitle } from "./brand-metadata";
export { brandAuthors, brandKeywords } from "./brand-metadata";
export { brandUrl, isBuiltInLink, isPoweredByShown } from "./copy";
export { brandRouteResponse } from "./brand-route.server";

/**
 * The effective brand of this request: the mounted brand pack while the
 * `white-labeling` flag is on, else the built-in Endatix brand. Never throws.
 * Pass it to `AppProvider` as `brand`.
 */
export const getBrand = cache(async (): Promise<Brand> => {
  return (await resolveDeploymentBrand()).brand;
});

/**
 * For respondent pages (`/share`, `/embed`): built-in values and no stylesheet.
 * Branding respondent pages is a later phase; this name keeps a copied layout
 * from dropping the brand without anyone noticing.
 */
export const RESPONDENT_BRAND_DEFERRED: Brand = BUILT_IN_BRAND;

/**
 * True when `brand` is the built-in brand (no pack, or the flag off). Server only:
 * a brand that crossed to the client is a copy. Pass the answer down as a prop,
 * like `brandTitle`'s `builtIn`, for copy whose built-in wording a pack can't reuse.
 */
export function isBuiltInBrand(brand: Brand): boolean {
  return brand === BUILT_IN_BRAND;
}

/**
 * The brand for `/share` and `/embed`: `RESPONDENT_BRAND_DEFERRED`, with the
 * deployment's `poweredBy`, which is a deployment setting rather than a look.
 */
export async function getRespondentBrand(): Promise<Brand> {
  const { poweredBy } = await getBrand();
  return { ...RESPONDENT_BRAND_DEFERRED, poweredBy };
}

/**
 * For a root layout's `generateMetadata`: the brand's name, icon, application
 * name and publisher, and optionally a title template and the social image for
 * the pages below. Spread it first, then add the layout's own fields. Pages
 * declare their own `title` and `description`; Next merges the rest.
 */
export async function brandLayoutMetadata(
  options?: BrandLayoutOptions,
): Promise<Metadata> {
  return layoutMetadataFor(await getBrand(), options);
}

/**
 * A title no layout template reaches (a root layout's own, or a respondent
 * page's): "<page> | <name>" with a pack, `builtIn` (when given) without one:
 * `brandTitle({ page: "Form", builtIn: "Endatix Form" })`.
 */
export async function brandTitle(title: BrandTitle): Promise<string> {
  const brand = await getBrand();
  return titleFor(brand, title, isBuiltInBrand(brand));
}

import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import { metadataFor, type BrandPage } from "./brand-metadata";
import type { Brand } from "./index";
import {
  BUILT_IN_BRAND,
  resolveDeploymentBrand,
} from "./effective-brand.server";

export type { Brand, BrandLinkKey } from "./index";
export type { BrandPage } from "./brand-metadata";
export { brandAuthors, brandKeywords } from "./brand-metadata";
export { brandUrl, withIndefiniteArticle } from "./copy";
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
 * The brand's metadata for a root layout (no page) or a page: title
 * "<page> | <name>" (or the page's `builtInTitle` while no pack applies),
 * application name, publisher, icon, and for a described page the social
 * image. Spread it first, then add the page's own fields.
 */
export async function brandMetadata(page?: BrandPage): Promise<Metadata> {
  const brand = await getBrand();
  return metadataFor(brand, page, { builtIn: brand === BUILT_IN_BRAND });
}

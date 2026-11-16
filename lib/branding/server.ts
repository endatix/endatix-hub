import "server-only";

import { cache } from "react";
import type { Brand } from "./index";
import {
  BUILT_IN_BRAND,
  resolveDeploymentBrand,
} from "./effective-brand.server";

export type { Brand, BrandLinkKey } from "./index";
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

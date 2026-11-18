import type { Brand, BrandLinkKey } from "./index";
import { BUILT_IN_LAYER } from "./layers";

const BUILT_IN_LINKS = BUILT_IN_LAYER.values.links;

/**
 * A deep link into one of the brand's sites: `builtInUrl` while the brand's `key`
 * link is the built-in one, else the brand's own link, or undefined when it has
 * none (hide the link). A pack's site has none of the built-in deep paths.
 */
export function brandUrl(
  brand: Pick<Brand, "links">,
  key: BrandLinkKey,
  builtInUrl: string,
): string | undefined {
  return isBuiltInLink(brand, key) ? builtInUrl : brand.links[key];
}

/**
 * Whether the "Powered by" line shows: the pack's `poweredBy` when it sets one,
 * else `ENDATIX_SHOW_POWERED_BY` (deprecated fallback), passed in as `envShown`.
 */
export function isPoweredByShown(
  brand: Pick<Brand, "poweredBy"> | null,
  envShown: boolean,
): boolean {
  return brand?.poweredBy ?? envShown;
}

/** True while the brand's `key` link is the built-in one: no pack, or a pack that keeps it. */
export function isBuiltInLink(
  brand: Pick<Brand, "links">,
  key: BrandLinkKey,
): boolean {
  const link = brand.links[key];
  return link !== undefined && link === BUILT_IN_LINKS[key];
}

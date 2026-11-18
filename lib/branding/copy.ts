import type { Brand, BrandLinkKey } from "./index";
import { BUILT_IN_LAYER } from "./layers";

const BUILT_IN_LINKS = BUILT_IN_LAYER.values.links;

/** "an Endatix", "a Contoso": the article by the name's first letter, for running text. */
export function withIndefiniteArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;
}

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
  const link = brand.links[key];
  return link !== undefined && link === BUILT_IN_LINKS[key] ? builtInUrl : link;
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

/** `brand` with `deployment`'s "Powered by" setting. */
export function withPoweredBy(
  brand: Brand,
  deployment: Pick<Brand, "poweredBy">,
): Brand {
  return { ...brand, poweredBy: deployment.poweredBy };
}

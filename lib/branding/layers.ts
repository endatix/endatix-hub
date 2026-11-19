import { BUILT_IN_ASSETS, BUILT_IN_NAME } from "./built-in-assets";
import { parseCssColor } from "./color";
import type { Brand, BrandStylesheet } from "./index";
import { toStylesheet, type BrandColor } from "./palette";
import type { BrandPack } from "./schema";

type BrandFields = Omit<Brand, "stylesheet">;

/**
 * One source of brand values, already parsed and with its files resolved to
 * URLs. A layer sets only what its source sets. `logo` and `color` are whole
 * groups, so the merge never pairs one layer's light logo with another's dark.
 */
export interface BrandLayer {
  readonly values: Partial<Omit<BrandFields, "links" | "personas">> & {
    readonly links?: BrandFields["links"];
    readonly personas?: Partial<BrandFields["personas"]>;
  };
  readonly color: BrandColor | null;
}

/** Today's literals. Its stylesheet is empty, so the Hub CSS stays as shipped. */
export const BUILT_IN_LAYER: BrandLayer & { readonly values: BrandFields } = {
  values: {
    name: BUILT_IN_NAME,
    shortName: "Endatix",
    legalName: "Endatix Ltd.",
    logo: BUILT_IN_ASSETS.logo,
    icon: BUILT_IN_ASSETS.icon,
    ogImage: BUILT_IN_ASSETS.ogImage,
    links: {
      website: "https://endatix.com",
      docs: "https://docs.endatix.com",
      support: "https://github.com/endatix/endatix/issues",
    },
    poweredBy: null,
    personas: { assistant: "Endatix AI Assistant", bot: "Endatix Bot" },
  },
  color: null,
};

/** The deployment layer from a parsed pack. `assetUrl` maps a pack file to its URL. */
export function packLayer(
  pack: BrandPack,
  assetUrl: (file: string) => string,
): BrandLayer {
  return {
    values: {
      name: pack.name,
      shortName: pack.name,
      legalName: pack.legalName ?? pack.name,
      ...packAssets(pack.assets, assetUrl),
      links: pack.links ?? {},
      poweredBy: pack.poweredBy,
      personas: {
        assistant: pack.personas?.assistant ?? `${pack.name} AI Assistant`,
        bot: pack.personas?.bot ?? `${pack.name} Bot`,
      },
    },
    color: packColor(pack.tokens?.color),
  };
}

function packAssets(
  assets: BrandPack["assets"],
  assetUrl: (file: string) => string,
): Pick<BrandLayer["values"], "logo" | "icon" | "ogImage"> {
  const logo = assets?.logo;
  return {
    logo: logo && {
      light: assetUrl(logo.light),
      dark: assetUrl(logo.dark ?? logo.light),
    },
    icon: assets?.icon && assetUrl(assets.icon),
    ogImage: assets?.ogImage && assetUrl(assets.ogImage),
  };
}

/** The schema has already checked both colours parse. */
export function packColor(
  color: NonNullable<BrandPack["tokens"]>["color"],
): BrandColor | null {
  if (!color) return null;
  const onDark = color["primary-on-dark"]?.$value;
  return {
    primary: parseCssColor(color.primary.$value)!,
    onDark: onDark ? parseCssColor(onDark)! : null,
  };
}

/** Pure. Layers are ordered most specific first and end with `BUILT_IN_LAYER`. */
export function mergeBrand(layers: readonly BrandLayer[]): Brand {
  const pick = <K extends keyof BrandLayer["values"]>(key: K) =>
    layers.find((layer) => layer.values[key] !== undefined)?.values[key];
  const builtIn = BUILT_IN_LAYER.values;
  const color = layers.find((layer) => layer.color !== null)?.color ?? null;

  return {
    name: pick("name") ?? builtIn.name,
    shortName: pick("shortName") ?? builtIn.shortName,
    legalName: pick("legalName") ?? builtIn.legalName,
    logo: pick("logo") ?? builtIn.logo,
    icon: pick("icon") ?? builtIn.icon,
    ogImage: pick("ogImage") ?? builtIn.ogImage,
    links: pick("links") ?? builtIn.links,
    poweredBy: pick("poweredBy") ?? builtIn.poweredBy,
    personas: mergeKeys(layers, "personas") as Brand["personas"],
    stylesheet: toStylesheet(color) as BrandStylesheet,
  };
}

/** Key by key, the most specific layer winning each key. */
function mergeKeys(layers: readonly BrandLayer[], group: "personas") {
  return Object.assign(
    {},
    ...layers.map((layer) => layer.values[group]).reverse(),
  );
}

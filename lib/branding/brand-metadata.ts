import type { Metadata } from "next";
import type { Brand } from "./index";

/** What a root layout hands down to the pages below it. */
export interface BrandLayoutOptions {
  /** Pages below get "<page title> | <brand name>". Leave off where page titles stand alone. */
  readonly titleTemplate?: boolean;
  /** Pages below get the brand's social image; Next fills og:title and og:description from each page. */
  readonly socialImage?: boolean;
}

/** A title no layout template can give: the layout's own, or a respondent page's. */
export interface BrandTitle {
  readonly page: string;
  /** The whole title while no pack applies, when it differs from "<page> | Endatix Hub". */
  readonly builtIn?: string;
}

const ICON_TYPES: Readonly<Record<string, string>> = {
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * A root layout's brand metadata: its name as the title (and, with
 * `titleTemplate`, the template for the pages below), application name,
 * publisher, icon and, with `socialImage`, the social image. Next merges it
 * into every page below, so pages declare only their own metadata.
 */
export function layoutMetadataFor(
  brand: Brand,
  options: BrandLayoutOptions = {},
): Metadata {
  return {
    title: options.titleTemplate
      ? { default: brand.name, template: `%s | ${brand.name}` }
      : brand.name,
    applicationName: brand.name,
    publisher: brand.legalName,
    icons: { icon: [iconLink(brand.icon)] },
    ...(options.socialImage &&
      brand.ogImage && { openGraph: { images: [{ url: brand.ogImage }] } }),
  };
}

/** "<page> | <name>", or `title.builtIn` while the built-in brand applies. */
export function titleFor(
  brand: Brand,
  title: BrandTitle,
  isBuiltInBrand: boolean,
): string {
  if (isBuiltInBrand && title.builtIn) return title.builtIn;
  return `${title.page} | ${brand.name}`;
}

function iconLink(url: string): { url: string; type?: string } {
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i
    .exec(url.split("/").at(-1) ?? "")?.[1]
    ?.toLowerCase();
  const type = extension ? ICON_TYPES[extension] : undefined;
  return type ? { url, type } : { url };
}

/** `authors` metadata: "<short name> Team", linked to the brand's website when it has one. */
export function brandAuthors(brand: Brand): NonNullable<Metadata["authors"]> {
  const name = `${brand.shortName} Team`;
  const url = brand.links.website;
  return [url ? { name, url } : { name }];
}

/** The brand's `keywords`: its short name, its name, and "<name> app", lower-cased and de-duplicated. */
export function brandKeywords(brand: Brand): string[] {
  const name = brand.name.toLowerCase();
  return [...new Set([brand.shortName.toLowerCase(), name, `${name} app`])];
}

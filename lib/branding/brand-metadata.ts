import type { Metadata } from "next";
import type { Brand } from "./index";

/** A page's own title and description; the brand adds its name, icon and social image. */
export interface BrandPage {
  /** Shown as "<title> | <brand name>". */
  readonly title?: string;
  /** The page's whole title while no pack applies, when it differs from "<title> | Endatix Hub". */
  readonly builtInTitle?: string;
  readonly description?: string;
}

/** `builtIn`: no pack applies (none mounted, or the flag is off). */
export interface BrandSource {
  readonly builtIn: boolean;
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
 * The brand's part of a page's metadata. With a page, the title carries the
 * brand name; a page with a description also gets a social preview with the
 * brand's image.
 */
export function metadataFor(
  brand: Brand,
  page?: BrandPage,
  source: BrandSource = { builtIn: false },
): Metadata {
  return {
    title: titleFor(brand, page, source),
    applicationName: brand.name,
    publisher: brand.legalName,
    icons: { icon: [iconLink(brand.icon)] },
    ...(page?.description && socialPreview(brand, page.description)),
  };
}

function titleFor(
  brand: Brand,
  page: BrandPage | undefined,
  source: BrandSource,
) {
  if (source.builtIn && page?.builtInTitle) return page.builtInTitle;
  return page?.title ? `${page.title} | ${brand.name}` : brand.name;
}

function socialPreview(brand: Brand, description: string): Metadata {
  return {
    description,
    openGraph: {
      description,
      ...(brand.ogImage && { images: [{ url: brand.ogImage }] }),
    },
  };
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

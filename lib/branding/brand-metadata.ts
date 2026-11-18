import type { Metadata } from "next";
import type { Brand } from "./index";

/** A page's own title and description; the brand adds its name, icon and social image. */
export interface BrandPage {
  /** Shown as "<title> | <brand name>". */
  readonly title?: string;
  readonly description?: string;
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
 * brand name and the social preview the brand's image.
 */
export function metadataFor(brand: Brand, page?: BrandPage): Metadata {
  return {
    title: page?.title ? `${page.title} | ${brand.name}` : brand.name,
    applicationName: brand.name,
    publisher: brand.legalName,
    icons: { icon: [iconLink(brand.icon)] },
    ...(page && pageMetadata(brand, page)),
  };
}

function pageMetadata(brand: Brand, page: BrandPage): Metadata {
  const description = page.description;
  return {
    ...(description && { description }),
    openGraph: {
      ...(description && { description }),
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

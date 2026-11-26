import "server-only";
import { cache } from "react";
import { getBrand } from "@/lib/branding/server";
import type { Brand } from "@/lib/branding";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import { withBasePath } from "@/lib/hosting/base-path";
import { readPublication } from "./publication.server";

function webLink(value?: string) {
  if (!value || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
}

function documentLinks(brand: Brand, published: { terms: boolean; privacy: boolean }) {
  return {
    terms: published.terms ? withBasePath("/legal/terms") : brand.links.terms ?? webLink(process.env.ENDATIX_TERMS_URL),
    privacy: published.privacy ? withBasePath("/accept-terms/privacy") : brand.links.privacy ?? webLink(process.env.ENDATIX_PRIVACY_URL),
  };
}

const unpublished = { terms: false, privacy: false };
async function publishedLinks() {
  const [terms, privacy] = await Promise.all([readPublication("terms"), readPublication("privacy")]);
  return { terms: !!terms.document, privacy: !!privacy.document };
}

// Auth screens share the anonymous API read quota. Cache only link availability, never a signup's consent text or Required setting.
let footerCache: { expiresAt: number; links: ReturnType<typeof publishedLinks> } | undefined;
export function invalidateLegalFooter() {
  footerCache = undefined;
}

function footerPublications() {
  if (!footerCache || Date.now() >= footerCache.expiresAt) {
    footerCache = { expiresAt: Date.now() + 15_000, links: publishedLinks() };
  }
  return footerCache.links;
}

export async function footerLegalLinks() {
  const [brand, enabled] = await Promise.all([getBrand(), termsAcceptanceEnabled()]);
  return documentLinks(brand, enabled ? await footerPublications() : unpublished);
}

export const publicLegalLinks = cache(async () => {
  const [brand, enabled] = await Promise.all([getBrand(), termsAcceptanceEnabled()]);
  const [terms, privacy] = enabled
    ? await Promise.all([readPublication("terms"), readPublication("privacy")])
    : [];
  return {
    ...documentLinks(brand, {terms: !!terms?.document, privacy: !!privacy?.document}),
    required: terms?.document?.acceptanceRequired ? terms.document : undefined,
    unavailable: enabled && !terms?.missing && terms?.document?.acceptanceRequired === undefined,
  };
});

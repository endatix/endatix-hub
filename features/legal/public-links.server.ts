import "server-only";
import { cache } from "react";
import { getBrand } from "@/lib/branding/server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import { withBasePath } from "@/lib/hosting/base-path";
import { readPublication } from "./publication.server";

function webLink(value?: string) {
  if (!value || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
}

export const publicLegalLinks = cache(async () => {
  const [brand, enabled] = await Promise.all([getBrand(), termsAcceptanceEnabled()]);
  const [terms, privacy] = enabled
    ? await Promise.all([readPublication("terms"), readPublication("privacy")])
    : [];
  return {
    terms: terms?.document
      ? withBasePath("/legal/terms")
      : (brand.links.terms ?? webLink(process.env.ENDATIX_TERMS_URL)),
    privacy: privacy?.document
      ? withBasePath("/accept-terms/privacy")
      : (brand.links.privacy ?? webLink(process.env.ENDATIX_PRIVACY_URL)),
    required: terms?.document?.acceptanceRequired ? terms.document : undefined,
    unavailable: enabled && !terms?.missing && terms?.document?.acceptanceRequired === undefined,
  };
});

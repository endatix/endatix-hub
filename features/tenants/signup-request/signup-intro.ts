import type { Brand } from "@/lib/branding";

/**
 * The signup page's one-line intro. With no brand pack it is the original
 * sentence, word for word; a pack gets a form that needs no article.
 */
export function signupIntro(
  brand: Pick<Brand, "shortName">,
  builtIn: boolean,
): string {
  return builtIn
    ? // eslint-disable-next-line no-restricted-syntax -- the built-in sentence, shown only while no brand pack applies
      "Request access to an Endatix workspace."
    : `Request access to a workspace on ${brand.shortName}.`;
}

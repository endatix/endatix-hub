// Files that still name Endatix in a string or JSX text, each for the reason given. This list only
// shrinks: __tests__/lint/product-name-ratchet.test.ts pins it, and fails on an entry whose file no
// longer names Endatix. New code takes the name from the brand (lib/branding/README.md, Copy).
export const productNameBaseline = [
  // Respondent pages keep the built-in look for now (getRespondentBrand()).
  "app/(public)/share/layout.tsx",
  String.raw`app/(public)/embed/\[formId\]/layout.tsx`,
  // "Powered by Endatix" is the vendor attribution; a pack turns it off, not into its own name.
  "components/public-status/powered-by.tsx",
  "components/public-status/public-status-page.tsx",
  // Developer and operator messages: config errors, logs, console prefixes, provider ids.
  "features/config/api-config.ts",
  "features/config/experimental-config.ts",
  "features/auth/use-cases/view-settings-summary/auth-settings-drift.ts",
  "features/auth/infrastructure/providers/endatix-auth-provider.ts",
  "features/embed-form/ui/use-survey-embed-behavior.ts",
  "lib/survey-extensions/core-registry.ts",
  "lib/survey-extensions/server/analyzer.ts",
  "lib/hosting/check-node-version.ts",
  // The API client's network message is a dev-only detail, never shown in production.
  "lib/endatix-api/endatix-api.ts",
  // Audience link errors: the API's capability messages.
  "features/audience/generate-links/personal-links.ts",
  "features/audience/reissue-link/reissue-audience-link.action.ts",
  "features/audience/copy-test-link/create-test-link.action.ts",
];

/** "Endatix", an endatix.com link, or a github.com/endatix link. */
export const PRODUCT_NAME_PATTERN = String.raw`/\bEndatix\b|endatix\.com|github\.com\/endatix/`;

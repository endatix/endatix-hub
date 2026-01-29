import sanitize, { AllowedAttribute, IOptions } from "sanitize-html";

/**
 * Allowed HTML tags for rich text content in surveys.
 */
const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "ins",
  "li",
  "ol",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
] as const;

/**
 * Allowed HTML attributes per tag.
 * '*' applies to all tags.
 */
const ALLOWED_ATTRIBUTES: Record<string, AllowedAttribute[]> = {
  "*": ["style", "class", "role", "title"],
  a: ["target", "href", "title", "rel"],
  img: ["src", "srcset", "alt", "title", "width", "height"],
};

/**
 * Allowed URL schemes for links and images.
 */
const ALLOWED_SCHEMES = ["https", "mailto", "tel"] as const;
const ALLOWED_IMAGE_SCHEMES = ["data", "https"] as const;

/**
 * Transform function to enforce security attributes on external links.
 */
function enforceLinkSecurity(
  tagName: string,
  attribs: Record<string, string>,
): { tagName: string; attribs: Record<string, string> } {
  const href = attribs.href;
  if (!href) {
    return { tagName, attribs };
  }

  // Check if it's an external link (not mailto, tel, or same origin)
  const isExternalLink =
    href.startsWith("https://") &&
    !href.startsWith("mailto:") &&
    !href.startsWith("tel:");

  if (isExternalLink) {
    // Enforce security attributes for external links
    const existingRel = attribs.rel || "";
    const relSet = new Set(
      existingRel.split(/\s+/).filter((r) => r.length > 0),
    );
    relSet.add("noopener");
    relSet.add("noreferrer");

    return {
      tagName,
      attribs: {
        ...attribs,
        rel: Array.from(relSet).join(" "),
        target: attribs.target || "_blank",
      },
    };
  }

  return { tagName, attribs };
}

/**
 * Strict sanitization preset - minimal tags, maximum security.
 * Use for untrusted user input or highly sensitive contexts.
 */
const strictSanitizationOptions: IOptions = {
  allowedTags: ["strong", "em", "u", "s", "code", "span"],
  allowedAttributes: {
    "*": ["style", "class"],
    span: ["style", "class"],
  },
  allowedSchemes: [],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nestingLimit: 2,
};

/**
 * Moderate sanitization preset - balanced security and functionality.
 * This is the default preset for rich text content in surveys.
 * 
 * Security features:
 * - Blocks protocol-relative URLs (//evil.com)
 * - Only allows https, mailto, tel schemes
 * - Limits nesting depth to prevent DoS
 * - Strips dangerous tags and attributes
 * - Enforces rel="noopener noreferrer" on external links via transform
 */
const moderateSanitizationOptions: IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: [...ALLOWED_SCHEMES],
  allowedSchemesByTag: {
    img: [...ALLOWED_IMAGE_SCHEMES],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nestingLimit: 3,
  transformTags: {
    a: enforceLinkSecurity,
  },
};

/**
 * Default sanitization options - uses moderate preset.
 * 
 * @internal This configuration is security-critical. Changes should be reviewed carefully.
 */
const defaultSanitizationOptions = moderateSanitizationOptions;

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving safe formatting.
 * 
 * @param dirtyHtml - The potentially unsafe HTML string to sanitize
 * @param sanitizeOptions - Optional custom sanitization options. Defaults to secure recommended options.
 * @returns The sanitized HTML string safe for rendering
 * 
 * @example
 * ```typescript
 * const safe = sanitizeHtml('<script>alert("XSS")</script><strong>Safe</strong>');
 * // Returns: '<strong>Safe</strong>'
 * ```
 */
function sanitizeHtml(
  dirtyHtml: string,
  sanitizeOptions: IOptions = defaultSanitizationOptions,
): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  return sanitize(dirtyHtml, sanitizeOptions);
}

/**
 * Sanitization preset configuration.
 * 
 * - `strict`: Minimal tags, maximum security (for untrusted input)
 * - `moderate`: Balanced security and functionality (default, for rich text)
 */
export const sanitizationPresets = {
  strict: strictSanitizationOptions,
  moderate: moderateSanitizationOptions,
} as const;

/**
 * HTML sanitizer utility for secure rich text rendering.
 * 
 * Provides secure HTML sanitization with sensible defaults for survey content.
 * Automatically enforces security best practices like rel="noopener noreferrer" on external links.
 * 
 * @example
 * ```typescript
 * // Use default (moderate) preset
 * const safe = htmlSanitizer.sanitize('<script>alert("XSS")</script><strong>Safe</strong>');
 * 
 * // Use strict preset for untrusted input
 * const strict = htmlSanitizer.sanitize(userInput, htmlSanitizer.presets.strict);
 * ```
 */
export const htmlSanitizer = {
  /**
   * Sanitizes HTML content to prevent XSS attacks.
   * 
   * @param dirtyHtml - The potentially unsafe HTML string to sanitize
   * @param sanitizeOptions - Optional custom sanitization options. Defaults to moderate preset.
   * @returns The sanitized HTML string safe for rendering
   */
  sanitize: sanitizeHtml,

  /**
   * Default sanitization options (moderate preset).
   * These options are security-focused and recommended for most use cases.
   */
  defaultOptions: defaultSanitizationOptions,

  /**
   * Available sanitization presets for different security requirements.
   */
  presets: sanitizationPresets,
} as const;

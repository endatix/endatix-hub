import { decodeHTMLStrict } from "entities";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { parseScalarString } from "@/lib/utils/type-parsers";

const MAX_DECODE_PASSES = 3;
const LITERAL_NEWLINE = String.raw`\n`;

/**
 * Decodes character references so a PDF `<Text>` shows the character itself.
 *
 * `sanitize-html` already decodes most of the named table - `&eacute;`,
 * `&hellip;`, `&#8212;` all come back as characters - but it deliberately
 * re-escapes the HTML-significant few (`&amp;`, `&lt;`, `&gt;`, `&quot;`,
 * `&#39;`), which is right for HTML and wrong for a PDF text node, where
 * "Tom &amp; Jerry" would print literally. Decoding those is what this is for;
 * `entities` covers named and numeric references, including invalid ones, so
 * there is nothing to hand-roll.
 *
 * Survey strings can be multiply encoded (paneldynamic `processedTitle`, for
 * one), so this loops until a pass changes nothing, capped against pathological
 * input. Decoding repeatedly would be unsafe if the result were HTML - it can
 * resurrect markup - which is why `pdfPlainText` sanitizes between passes and
 * why its output belongs in a PDF `<Text>`, never in a DOM.
 */
function decodeEntities(text: string): string {
  let current = text;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    const next = decodeHTMLStrict(current);
    if (next === current) {
      return next;
    }
    current = next;
  }

  return current;
}

/** react-pdf's font/layout handles a regular space better than a non-breaking one. */
function normalizeWhitespace(text: string): string {
  return text.replace(/ /g, " ");
}

function replaceLiteralNewlines(text: string): string {
  return text.includes(LITERAL_NEWLINE)
    ? text.replaceAll(LITERAL_NEWLINE, "\n")
    : text;
}

/**
 * Renders an answer value of any shape as text.
 *
 * Scalars go through `parseScalarString`. Everything else is JSON rather than
 * `String()`: matrix and paneldynamic answers are objects and arrays, and
 * `String()` would print `[object Object]` for one and a function's whole
 * source for the other.
 *
 * `JSON.stringify` is guarded because it is not total - it throws on a
 * circular value, which would fail the entire render, and returns `undefined`
 * for a function or symbol. Both end up as empty text, which is the right
 * outcome for something that cannot be shown in a PDF cell.
 */
function stringifyValue(value: unknown): string {
  const scalar = parseScalarString(value);
  if (scalar !== null) {
    return scalar;
  }

  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

/** Decode entities, strip HTML, turn literal \\n into newlines for PDF `<Text>`. */
export function pdfPlainText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const raw = typeof value === "string" ? value : stringifyValue(value);
  if (raw.length === 0) {
    return "";
  }

  if (!/[&<]/.test(raw)) {
    return replaceLiteralNewlines(normalizeWhitespace(raw));
  }

  const decoded = decodeEntities(raw);
  const stripped = decoded.includes("<")
    ? decodeEntities(htmlSanitizer.toPlainText(decoded))
    : decoded;

  return replaceLiteralNewlines(normalizeWhitespace(stripped));
}

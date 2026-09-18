import { decodeHTMLStrict } from "entities";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { stringifyUnknown } from "@/lib/utils/string-utils";

const MAX_DECODE_PASSES = 3;
const LITERAL_NEWLINE = String.raw`\n`;

/** Named + numeric refs via `entities`. Loop: Survey titles can be multiply encoded. */
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

const UNSHOWABLE_VALUE = "Cannot display this value";

/** stringifyUnknown with empty/unshowable fallbacks — never dump function source. */
function stringifyValue(value: unknown): string {
  if (typeof value === "function" || typeof value === "symbol") {
    return "";
  }

  if (value instanceof Error) {
    return UNSHOWABLE_VALUE;
  }

  return stringifyUnknown(value, {
    nullBehavior: "",
    undefinedBehavior: "",
    circularBehavior: "",
  });
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

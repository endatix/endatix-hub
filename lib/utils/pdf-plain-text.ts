import { decodeHTMLStrict } from "entities";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

const MAX_DECODE_PASSES = 3;
const LITERAL_NEWLINE = String.raw`\n`;

function codePointToChar(code: number): string {
  if (!Number.isInteger(code) || code < 1 || code > 0x10ffff) {
    return "";
  }

  return String.fromCodePoint(code);
}

function decodeNumericEntities(text: string): string {
  return text.replace(
    /&#x([0-9a-f]{1,6});|&#(\d{1,7});/gi,
    (_match: string, hex: string | undefined, decimal: string | undefined) =>
      codePointToChar(hex ? Number.parseInt(hex, 16) : Number(decimal)),
  );
}

/**
 * Decodes entities, including the full HTML named-entity table (not just the
 * handful survey content commonly uses). Survey strings can be multiply
 * encoded (e.g. paneldynamic `processedTitle`), so this loops until a pass
 * changes nothing, capped to avoid pathological input.
 */
function decodeEntities(text: string): string {
  let current = text;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    const next = decodeHTMLStrict(decodeNumericEntities(current));
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

function stringifyValue(value: unknown): string {
  return typeof value === "object" ? JSON.stringify(value) : String(value);
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

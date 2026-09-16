import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

const NAMED_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&amp;": "&",
};

function codePointToChar(code: number): string {
  if (!Number.isInteger(code) || code < 1 || code > 0x10ffff) {
    return "";
  }

  return String.fromCodePoint(code);
}

function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(?:#x([0-9a-f]{1,6})|#(\d{1,7})|nbsp|lt|gt|quot|apos|amp);/gi,
    (match: string, hex: string | undefined, decimal: string | undefined) => {
      if (hex) {
        return codePointToChar(parseInt(hex, 16));
      }
      if (decimal) {
        return codePointToChar(Number(decimal));
      }

      return NAMED_ENTITIES[match.toLowerCase()] ?? match;
    },
  );
}

function replaceLiteralNewlines(text: string): string {
  return text.includes("\\n") ? text.replace(/\\n/g, "\n") : text;
}

/** Decode entities, strip HTML, turn literal \\n into newlines for PDF `<Text>`. */
export function pdfPlainText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const raw = typeof value === "string" ? value : String(value);
  if (raw.length === 0) {
    return "";
  }

  if (!/[&<]/.test(raw)) {
    return replaceLiteralNewlines(raw);
  }

  const decoded = decodeHtmlEntities(raw);
  const stripped = decoded.includes("<")
    ? htmlSanitizer.toPlainText(decoded)
    : decoded;

  return replaceLiteralNewlines(stripped);
}

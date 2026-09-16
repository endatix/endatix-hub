import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

/** Unicode scalar values only; invalid numeric entities must not throw. */
function codePointToChar(code: number): string {
  if (!Number.isInteger(code) || code < 1 || code > 0x10ffff) {
    return "";
  }

  return String.fromCodePoint(code);
}

/**
 * Named + numeric entities in one linear pass. Captures are length-capped
 * so a huge digit run cannot inflate into fromCodePoint / Number.
 */
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

      switch (match.toLowerCase()) {
        case "&nbsp;":
          return " ";
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&quot;":
          return '"';
        case "&apos;":
          return "'";
        case "&amp;":
          return "&";
        default:
          return match;
      }
    },
  );
}

function replaceLiteralNewlines(text: string): string {
  return text.includes("\\n") ? text.replace(/\\n/g, "\n") : text;
}

/**
 * Plain text for @react-pdf/renderer &lt;Text&gt;: decode entities, strip HTML,
 * turn literal \\n into real line breaks.
 */
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

  const hasMarkupOrEntities = /[&<]/.test(raw);
  if (!hasMarkupOrEntities) {
    return replaceLiteralNewlines(raw);
  }

  const decoded = decodeHtmlEntities(raw);
  const stripped = decoded.includes("<")
    ? htmlSanitizer.toPlainText(decoded)
    : decoded;

  return replaceLiteralNewlines(stripped);
}

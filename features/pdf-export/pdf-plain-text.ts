import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&");
}

/**
 * Plain text for @react-pdf/renderer &lt;Text&gt;: decode entities, strip HTML,
 * turn literal \\n into real line breaks.
 */
export function pdfPlainText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const decoded = decodeHtmlEntities(String(value));
  return htmlSanitizer.toPlainText(decoded).replace(/\\n/g, "\n");
}

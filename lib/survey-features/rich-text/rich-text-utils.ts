const NON_BREAKING_SPACE_REGEX = /&nbsp;|\xA0/gi;
const SINGLE_PARAGRAPH_REGEX = /^<p>(((?!<\/?p>).)*)<\/p>$/i;
const WHITESPACE = " ";

/**
 * Normalizes whitespace in the text.
 * @param text - The text to normalize.
 * @returns The normalized text.
 */
export function normalizeWhitespace(text: string): string {
  if (!text || typeof text !== "string") return "";

  const processed = text.replaceAll(NON_BREAKING_SPACE_REGEX, WHITESPACE);
  return processed.trim();
}

/**
 * Unwraps a single paragraph from the HTML text. It is used to remove the <p> tags from the text and ensure inline formatting when single paragraph is expected.
 * @param htmlText - The HTML text to unwrap.
 * @returns The unwrapped HTML text.
 */
export function unwrapSingleParagraph(htmlText: string): string {
  if (!htmlText || typeof htmlText !== "string") return "";

  const match = SINGLE_PARAGRAPH_REGEX.exec(htmlText);
  if (match && match.length > 1) {
    return match[1].trim();
  }

  return htmlText;
}

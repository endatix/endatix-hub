export function resolveLocalizedText(title: unknown): string {
  if (typeof title === "string") {
    return title.trim();
  }
  if (title && typeof title === "object" && !Array.isArray(title)) {
    const o = title as Record<string, unknown>;
    const preferred =
      o.default ?? o.en ?? Object.values(o).find((v) => typeof v === "string");
    if (typeof preferred === "string") {
      return preferred.trim();
    }
  }
  return "";
}

export function toPlainText(input: string): string {
  let withoutTags = "";
  let inTag = false;
  for (const ch of input) {
    if (ch === "<") {
      inTag = true;
      withoutTags += " ";
      continue;
    }
    if (ch === ">") {
      inTag = false;
      continue;
    }
    if (!inTag) {
      withoutTags += ch;
    }
  }

  const normalizedLineBreaks = withoutTags
    .replace(/\r?\n/g, " ")
    .replace(/\t/g, " ");
  return normalizeControlAndWhitespace(
    decodeCommonHtmlEntities(normalizedLineBreaks),
  );
}

function decodeCommonHtmlEntities(input: string): string {
  return (
    input
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      // Decode ampersand last to avoid double-unescaping sequences like &amp;quot;.
      .replace(/&amp;/gi, "&")
  );
}

function normalizeControlAndWhitespace(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

import sanitize from "sanitize-html";

const authoredFields = ["title", "description", "text", "html", "completedHtml", "completedBeforeHtml", "loadingHtml"];
const surveyChildren = ["pages", "elements", "templateElements", "choices", "rows", "columns", "items", "completedHtmlOnCondition"];

function collectHtml(value: unknown, sources: Set<string>) {
  if (typeof value !== "string" || !/<img\b/i.test(value)) return;
  sanitize(value, {
    allowedTags: ["img"],
    allowedAttributes: { img: ["src"] },
    exclusiveFilter(frame) {
      if (frame.tag === "img" && frame.attribs.src) sources.add(frame.attribs.src);
      return false;
    },
  });
}

function collectLocalized(value: unknown, sources: Set<string>) {
  if (value && typeof value === "object") {
    Object.values(value).forEach((text) => collectHtml(text, sources));
  } else {
    collectHtml(value, sources);
  }
}

/** Only authored display properties participate; answers and remote catalogs do not. */
export function collectRichTextImageSources(definition: unknown): Set<string> {
  const sources = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const item = node as Record<string, unknown>;
    authoredFields.forEach((key) => collectLocalized(item[key], sources));
    for (const key of surveyChildren) {
      const children = item[key];
      if (Array.isArray(children)) children.forEach((child) => {
        if (typeof child === "string") collectHtml(child, sources);
        else visit(child);
      });
    }
  };
  visit(definition);
  return sources;
}

import sanitize from "sanitize-html";

const surveyFields = [
  "title",
  "description",
  "completedHtml",
  "completedBeforeHtml",
  "loadingHtml",
];
const elementFields = ["title", "description"];

function collectHtml(value: unknown, sources: Set<string>) {
  if (typeof value !== "string" || !/<img\b/i.test(value)) return;
  sanitize(value, {
    allowedTags: ["img"],
    allowedAttributes: { img: ["src"] },
    exclusiveFilter(frame) {
      if (frame.tag === "img" && frame.attribs.src)
        sources.add(frame.attribs.src);
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

type SurveyNode = Record<string, unknown>;

function items(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNode(value: unknown): SurveyNode {
  return value && typeof value === "object" ? (value as SurveyNode) : {};
}

function collectElement(value: unknown, sources: Set<string>) {
  const node = asNode(value);
  elementFields.forEach((key) => collectLocalized(node[key], sources));
  if (node.type === "html") collectLocalized(node.html, sources);
  for (const choice of [
    ...items(node.choices),
    ...items(node.rows),
    ...items(node.columns),
  ]) {
    collectLocalized(
      typeof choice === "string" ? choice : asNode(choice).text,
      sources,
    );
  }
  const children = [...items(node.elements), ...items(node.templateElements)];
  for (const child of children) {
    collectElement(child, sources);
  }
}

/** Only authored display properties participate; answers and remote catalogs do not. */
export function collectRichTextImageSources(definition: unknown): Set<string> {
  const sources = new Set<string>();
  const survey = asNode(definition);
  surveyFields.forEach((key) => collectLocalized(survey[key], sources));
  items(survey.completedHtmlOnCondition).forEach((entry) =>
    collectLocalized(asNode(entry).html, sources),
  );
  for (const child of [...items(survey.pages), ...items(survey.elements)]) {
    collectElement(child, sources);
  }
  return sources;
}

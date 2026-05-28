export function parseSurveyJsonRoot(
  json: string | object,
): Record<string, unknown> | null {
  try {
    return typeof json === "string"
      ? (JSON.parse(json) as Record<string, unknown>)
      : (json as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function forEachSurveyJsonNode(
  root: unknown,
  visit: (node: Record<string, unknown>) => void,
): void {
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    const o = node as Record<string, unknown>;
    visit(o);
    for (const key of [
      "elements",
      "rows",
      "columns",
      "templateElements",
    ] as const) {
      const children = o[key];
      if (Array.isArray(children)) {
        walk(children);
      }
    }
  };

  walk(root);
}

export function forEachSurveyJsonRoot(
  surveyJson: Record<string, unknown>,
  visit: (node: unknown) => void,
): void {
  if (Array.isArray(surveyJson.pages)) {
    for (const page of surveyJson.pages) {
      visit(page);
    }
    return;
  }
  if (Array.isArray(surveyJson.elements)) {
    for (const element of surveyJson.elements) {
      visit(element);
    }
    return;
  }
  visit(surveyJson);
}

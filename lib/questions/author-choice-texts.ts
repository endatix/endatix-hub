/**
 * Every choice text and string choice value written in a form definition.
 *
 * Hub renders a piped value as rich text only when it is one of these, because
 * then the form author wrote it. Anything else in a piped value (a respondent's
 * answer, a URL parameter, a variable) is shown as plain text.
 */
export function collectAuthorChoiceTexts(definition: unknown): Set<string> {
  const texts = new Set<string>();
  visit(definition, texts);
  return texts;
}

function visit(node: unknown, texts: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((child) => visit(child, texts));
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === "choices" && Array.isArray(child)) {
      child.forEach((choice) => addChoice(choice, texts));
    }
    visit(child, texts);
  }
}

function addChoice(choice: unknown, texts: Set<string>): void {
  if (typeof choice === "string") {
    texts.add(choice);
    return;
  }
  if (!choice || typeof choice !== "object") {
    return;
  }
  const { value, text } = choice as { value?: unknown; text?: unknown };
  addStrings([value], texts);
  addStrings(
    text && typeof text === "object" ? Object.values(text) : [text],
    texts,
  );
}

function addStrings(candidates: unknown[], texts: Set<string>): void {
  candidates.forEach((candidate) => {
    if (typeof candidate === "string") {
      texts.add(candidate);
    }
  });
}

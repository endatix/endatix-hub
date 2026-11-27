export type Path = readonly (string | number)[];
export type Field = {
  path: Path;
  location: string;
  text: string;
  kind: "html" | "native" | "unsupported";
};
type Node = Record<string, unknown>;
type Position = { path: Path; location: string };

function node(value: unknown): Node {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Node)
    : {};
}

function* localized(
  value: unknown,
  at: Position,
  kind: Field["kind"],
): Generator<Field> {
  if (typeof value === "string") {
    if (/data:image\//i.test(value)) yield { ...at, text: value, kind };
    return;
  }
  for (const [locale, text] of Object.entries(node(value))) {
    if (typeof text === "string" && /data:image\//i.test(text))
      yield {
        path: [...at.path, locale],
        location: `${at.location} · ${locale}`,
        text,
        kind,
      };
  }
}

type FieldGroup = { keys: readonly string[]; kind?: Field["kind"] };
function* fields(value: Node, at: Position, { keys, kind = "html" }: FieldGroup) {
  for (const key of keys) {
    yield* localized(
      value[key],
      { path: [...at.path, key], location: `${at.location} · ${key}` },
      kind,
    );
  }
}

function* children(value: Node, at: Position, key: string) {
  const list = value[key];
  if (!Array.isArray(list)) return;
  for (const [index, entry] of list.entries()) {
    const child = node(entry);
    const name = typeof child.name === "string" ? ` (${child.name})` : "";
    const position = {
      path: [...at.path, key, index],
      location: `${at.location} · ${key} ${index + 1}${name}`,
    };
    yield { child, entry, position };
  }
}

function* labels(value: Node, at: Position, key: string): Generator<Field> {
  for (const { child, entry, position } of children(value, at, key)) {
    // A shorthand choice is also the submitted value; changing it changes answers.
    if (typeof entry === "string")
      yield* localized(entry, position, "unsupported");
    yield* fields(child, position, { keys: ["text"] });
    yield* fields(child, position, { keys: ["imageLink", "imageUrl", "title"], kind: "unsupported" });
    if (key === "columns") yield* labels(child, position, "choices");
  }
}

function* element(value: Node, at: Position): Generator<Field> {
  yield* fields(value, at, { keys: ["title", "description"] });
  if (value.type === "html") yield* fields(value, at, { keys: ["html"] });
  yield* fields(value, at, { keys: ["imageLink"], kind: "unsupported" });
  if (at.path.length)
    yield* fields(value, at, { keys: ["backgroundImage"], kind: "unsupported" });
  for (const key of ["choices", "rows", "columns"])
    yield* labels(value, at, key);
  for (const key of ["elements", "templateElements"]) {
    for (const { child, position } of children(value, at, key))
      yield* element(child, position);
  }
}

export function* authoredImageFields(definition: unknown): Generator<Field> {
  const root = node(definition);
  const at = { path: [], location: "Survey" };
  yield* fields(root, at, { keys: [
    "completedHtml",
    "completedBeforeHtml",
    "loadingHtml",
  ] });
  yield* fields(root, at, { keys: ["logo"], kind: "native" });
  yield* fields(root, at, { keys: ["backgroundImage"], kind: "unsupported" });
  for (const { child, position } of children(
    root,
    at,
    "completedHtmlOnCondition",
  ))
    yield* fields(child, position, { keys: ["html"] });
  for (const { child, position } of children(root, at, "pages"))
    yield* element(child, position);
  yield* element(root, at);
}

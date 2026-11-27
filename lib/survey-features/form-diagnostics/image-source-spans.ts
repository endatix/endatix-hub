import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import type { Field } from "./authored-image-fields";

export interface Span {
  start: number;
  end: number;
  source: string;
  reason?: string;
}

function* images(
  root: DefaultTreeAdapterTypes.ParentNode,
): Generator<DefaultTreeAdapterTypes.Element> {
  for (const child of root.childNodes) {
    if (!("tagName" in child)) continue;
    if (
      child.tagName === "img" &&
      child.namespaceURI === "http://www.w3.org/1999/xhtml"
    )
      yield child;
    yield* images(child);
  }
}

function imageSource(
  image: DefaultTreeAdapterTypes.Element,
  text: string,
): Span | undefined {
  const loc = image.sourceCodeLocation?.attrs?.src;
  if (!loc) return;
  const attribute = text.slice(loc.startOffset, loc.endOffset);
  const prefix = /^src[\t\n\f\r ]*=[\t\n\f\r ]*(["']?)/i.exec(attribute);
  if (!prefix) return;
  const start = loc.startOffset + prefix[0].length;
  const end = loc.endOffset - prefix[1].length;
  const source = text.slice(start, end);
  if (
    !/^data:image\//i.test(source) ||
    source !== image.attrs.find((a) => a.name === "src")?.value
  )
    return;
  return { start, end, source };
}

function htmlSources(text: string) {
  const matches = new Map<number, Span>();
  let malformed = false;
  const fragment = parseFragment(text, {
    sourceCodeLocationInfo: true,
    onParseError: () => {
      malformed = true;
    },
  });
  if (malformed) return matches;
  for (const image of images(fragment)) {
    const span = imageSource(image, text);
    if (span) matches.set(span.start, span);
  }
  return matches;
}

export function* sourceSpans(field: Field): Generator<Span> {
  if (field.kind === "native" && /^data:image\//i.test(field.text)) {
    yield { start: 0, end: field.text.length, source: field.text };
    return;
  }
  const spans = field.kind === "html" ? htmlSources(field.text) : undefined;
  for (const marker of field.text.matchAll(/data:image\//gi)) {
    const match = spans?.get(marker.index);
    yield match ?? {
      start: marker.index,
      end: marker.index,
      source: "",
      reason:
        field.kind === "html"
          ? "Not an unambiguous img src (for example, CSS or srcset)."
          : "This field cannot be replaced without changing its behavior.",
    };
  }
}

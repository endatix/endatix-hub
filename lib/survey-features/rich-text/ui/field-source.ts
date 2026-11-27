import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { normalizeWhitespace, unwrapSingleParagraph } from "../rich-text-utils";

export function normalizeAndSanitize(value: string) {
  return unwrapSingleParagraph(htmlSanitizer.sanitize(normalizeWhitespace(value)));
}

function* imageTags(parent: DefaultTreeAdapterTypes.ParentNode): Generator<DefaultTreeAdapterTypes.Element> {
  for (const child of parent.childNodes) {
    if (!("tagName" in child)) continue;
    if (child.tagName === "img") yield child;
    else yield* imageTags(child);
  }
}

function changedImage(before: Node, after: Node) {
  const start = before.content.findDiffStart(after.content);
  if (start === null) return;
  const end = before.content.findDiffEnd(after.content);
  const image = before.nodeAt(start);
  if (image?.type.name !== "image" || end?.a !== start + 1 || end.b !== start + 1) return;
  if (after.nodeAt(start)?.type !== image.type) return;
  let index = 0;
  before.nodesBetween(0, start, node => { if (node.type === image.type) index++; });
  return { index, src: image.attrs.src };
}

function patchImage(source: string, html: string, change: NonNullable<ReturnType<typeof changedImage>>) {
  const tags = [...imageTags(parseFragment(source, { sourceCodeLocationInfo: true }))];
  const original = tags[change.index];
  const location = original?.sourceCodeLocation;
  if (!location || original.attrs.find(a => a.name === "src")?.value !== change.src) return;
  const template = document.createElement("template");
  template.innerHTML = html;
  const images = template.content.querySelectorAll("img");
  if (images.length !== tags.length) return;
  return source.slice(0, location.startOffset) + htmlSanitizer.sanitize(images[change.index].outerHTML) + source.slice(location.endOffset);
}

/** Preserve exact source around a single image edit, including markup that
 * the editor's schema does not model. Undo can return to the original spelling. */
export class FieldSource {
  private readonly history = new WeakMap<Node, string>();
  constructor(public value: string) {}

  update(editor: Editor, transaction: Transaction) {
    const html = editor.getHTML();
    const change = changedImage(transaction.before, editor.state.doc);
    const previous = this.history.get(editor.state.doc);
    this.history.set(transaction.before, this.value);
    this.value = previous ?? (change && patchImage(this.value, html, change)) ?? normalizeAndSanitize(html);
    return this.value;
  }
}

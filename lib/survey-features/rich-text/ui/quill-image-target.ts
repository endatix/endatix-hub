import { Delta, type default as Quill } from "quill";
import type { ImageTarget } from "./image-settings-target";

export function quillImageTarget(editor: Quill, selected?: HTMLImageElement): ImageTarget {
  const images = Array.from(editor.root.querySelectorAll("img"));
  const originals = images.map(image => image.outerHTML);
  const insertion = editor.getSelection()?.index ?? editor.getLength() - 1;
  const snapshot = editor.getContents();
  function commit(index: number, image: HTMLImageElement) {
    if (!editor.isEnabled() || !editor.root.isConnected) return false;
    const original = images[index];
    if (original && !sameImage(editor, original, originals[index])) return false;
    if (!original && snapshot.diff(editor.getContents()).length()) return false;
    const position = original ? imagePosition(editor, original) : insertion;
    if (position < 0) return false;
    const embed = editor.clipboard.convert({ html: image.outerHTML });
    if (original) retainInlineFormats(editor, position, embed);
    editor.history.cutoff();
    editor.updateContents(new Delta().retain(position).delete(original ? 1 : 0).concat(embed), "user");
    editor.history.cutoff();
    return true;
  }
  return { images, selected: selected ? images.indexOf(selected) : -1, commit };
}

function retainInlineFormats(editor: Quill, position: number, embed: Delta) {
  const previous = { ...editor.getContents(position, 1).ops[0]?.attributes };
  for (const key of ["alt", "width", "height", "imageWidth", "imageHeight", "imageCap"]) delete previous[key];
  embed.ops[0].attributes = { ...previous, ...embed.ops[0].attributes };
}

function sameImage(editor: Quill, image: HTMLImageElement, original: string) {
  return editor.root.contains(image) && image.outerHTML === original;
}

function imagePosition(editor: Quill, image: HTMLImageElement) {
  // eslint-disable-next-line unicorn/no-array-callback-reference -- Parchment looks up a blot by DOM node, not by array predicate.
  const blot = editor.scroll.find(image, false);
  return blot ? editor.getIndex(blot) : -1;
}

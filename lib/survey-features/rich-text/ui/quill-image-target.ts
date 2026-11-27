import { Delta, type default as Quill } from "quill";
import type { ImageTarget } from "./image-settings-target";

export function quillImageTarget(editor: Quill, selected?: HTMLImageElement, scope: ImageTarget["scope"] = "field"): ImageTarget {
  const images = Array.from(editor.root.querySelectorAll("img"));
  const insertion = editor.getSelection()?.index ?? editor.getLength() - 1;
  const snapshot = editor.getContents();
  function commit(index: number, image: HTMLImageElement | null) {
    if (!editor.isEnabled() || !editor.root.isConnected) return false;
    const original = images[index];
    if (snapshot.diff(editor.getContents()).length()) return false;
    const position = original ? imagePosition(editor, original) : insertionPosition(index, image, insertion);
    if (position < 0) return false;
    const edit = new Delta().retain(position).delete(original ? 1 : 0);
    applyEdit(editor, image ? edit.concat(imageEmbed(editor, image, original ? position : -1)) : edit);
    return true;
  }
  return { scope, images, selected: images.indexOf(selected ?? images[0]), commit };
}

function insertionPosition(index: number, image: HTMLImageElement | null, position: number) {
  return index === -1 && image ? position : -1;
}

function imageEmbed(editor: Quill, image: HTMLImageElement, previousPosition: number) {
  const embed = editor.clipboard.convert({ html: image.outerHTML });
  if (previousPosition >= 0) retainInlineFormats(editor, previousPosition, embed);
  return embed;
}

function applyEdit(editor: Quill, edit: Delta) {
  editor.history.cutoff();
  editor.updateContents(edit, "user");
  editor.history.cutoff();
}

function retainInlineFormats(editor: Quill, position: number, embed: Delta) {
  const previous = { ...editor.getContents(position, 1).ops[0]?.attributes };
  for (const key of ["alt", "width", "height", "imageWidth", "imageHeight", "imageCap", "imageLabel"]) delete previous[key];
  embed.ops[0].attributes = { ...previous, ...embed.ops[0].attributes };
}

function imagePosition(editor: Quill, image: HTMLImageElement) {
  // eslint-disable-next-line unicorn/no-array-callback-reference -- Parchment looks up a blot by DOM node, not by array predicate.
  const blot = editor.scroll.find(image, false);
  return blot ? editor.getIndex(blot) : -1;
}

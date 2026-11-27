import Quill, { Delta } from "quill";
import type { ImageTarget } from "./image-settings-target";

export function quillImageTarget(editor: Quill, selected?: HTMLImageElement): ImageTarget {
  const images = Array.from(editor.root.querySelectorAll("img"));
  const originals = images.map(image => image.outerHTML);
  const insertion = editor.getSelection()?.index ?? editor.getLength() - 1;
  const snapshot = editor.getContents();
  function commit(index: number, image: HTMLImageElement) {
    if (!editor.isEnabled() || !editor.root.isConnected) return false;
    const original = images[index];
    const blot = original && Quill.find(original);
    if (original && (!editor.root.contains(original) || original.outerHTML !== originals[index])) return false;
    if (!original && snapshot.diff(editor.getContents()).length()) return false;
    const position = blot && !(blot instanceof Quill) ? editor.getIndex(blot) : insertion;
    const embed = editor.clipboard.convert({ html: image.outerHTML });
    editor.history.cutoff();
    editor.updateContents(new Delta().retain(position).delete(original ? 1 : 0).concat(embed), "user");
    editor.history.cutoff();
    return true;
  }
  return { images, selected: selected ? images.indexOf(selected) : -1, commit };
}

/** Keep grants out of both the editable DOM and the author's clipboard. */
export function showEditorImage(editor: HTMLElement, src: string, signed: string) {
  const source = CSS.escape(src);
  let style = editor.querySelector<HTMLStyleElement>(`:scope > style[data-image-preview="${source}"]`);
  if (!style) {
    style = document.createElement("style");
    style.dataset.imagePreview = src;
    editor.append(style);
  }
  const selector = `#${CSS.escape(editor.id)} .tiptap img[src="${source}"]`;
  style.textContent = `${selector} { content: url("${CSS.escape(signed)}"); }`;
}

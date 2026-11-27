import { Editor } from "@tiptap/core";

export function mountedEditor(index = 0) {
  const element = document.querySelectorAll(".tiptap")[index];
  if (!element || !("editor" in element) || !(element.editor instanceof Editor)) throw new Error("Missing rich-text editor");
  return element.editor;
}

export function paste(editor: Editor, html: string, files: File[]) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { files, getData: (type: string) => type === "text/html" ? html : "" },
  });
  editor.view.dom.dispatchEvent(event);
}

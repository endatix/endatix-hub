// @vitest-environment jsdom
import Quill from "quill";
import { expect, it } from "vitest";
import "../ui/rich-text-editor.component";

it("preserves responsive dimensions and bold text when editing only the caption", () => {
  const editor = new Quill(document.createElement("div"));
  const html = '<img src="https://example.invalid/a.png" style="max-width:100px;width:100%;height:auto"><br><strong>Caption</strong>';
  editor.setContents(editor.clipboard.convert({ html }));
  editor.insertText(editor.getLength() - 1, "!", "user");
  const reopened = new Quill(document.createElement("div"));
  reopened.setContents(reopened.clipboard.convert({ html: editor.getSemanticHTML() }));
  const image = reopened.root.querySelector("img")!;
  expect(image.style.maxWidth).toBe("100px");
  expect(image.style.width).toBe("100%");
  expect(image.style.height).toBe("auto");
  expect(reopened.root.querySelector("strong")?.textContent).toBe("Caption!");
});

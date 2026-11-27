// @vitest-environment jsdom
import Quill from "quill";
import { expect, it, vi } from "vitest";
import "../ui/rich-text-editor.component";
import { quillImageTarget } from "../ui/quill-image-target";
import { imageDraft } from "../ui/image-settings-target";
import { bindImageTransfers } from "../ui/quill-image-transfers";

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

function editorWithTwoImages() {
  const editor = new Quill(document.body.appendChild(document.createElement("div")));
  const html = '<img src="https://example.invalid/a.png"><a href="https://example.invalid"><img alt="Second" width="81" src="https://example.invalid/a.png"></a><strong>Caption</strong>';
  editor.setContents(editor.clipboard.convert({ html }));
  return editor;
}

it("edits only the selected occurrence and undoes the change as one action", () => {
  const editor = editorWithTwoImages();
  const before = editor.getContents();
  const target = quillImageTarget(editor, editor.root.querySelectorAll("img")[1]);
  const image = imageDraft(target, target.selected);
  image.alt = "Updated";
  expect(target.commit(target.selected, image)).toBe(true);
  expect(editor.root.querySelector("img")?.hasAttribute("alt")).toBe(false);
  expect(editor.root.querySelector("a img")?.getAttribute("alt")).toBe("Updated");
  expect(editor.root.querySelector("a img")?.getAttribute("width")).toBe("81");
  editor.history.undo();
  expect(editor.getContents()).toEqual(before);
});

it("rejects a pending edit when its image is removed or editing is disabled", () => {
  const editor = editorWithTwoImages();
  const target = quillImageTarget(editor, editor.root.querySelector("img")!);
  const image = imageDraft(target, target.selected);
  editor.disable();
  expect(target.commit(target.selected, image)).toBe(false);
  editor.enable();
  editor.deleteText(0, 1, "user");
  expect(target.commit(target.selected, image)).toBe(false);
});

it("caps a newly uploaded choice image without touching existing unsized or custom images", async () => {
  const editor = editorWithTwoImages();
  const store = vi.fn().mockResolvedValue("https://example.invalid/b.png");
  const stop = bindImageTransfers(editor, store, { publish: vi.fn(), choiceLabel: true });
  editor.uploader.upload({ index: 0, length: 0 }, [new File(["pixels"], "b.png", { type: "image/png" })]);
  await vi.waitFor(() => expect(editor.root.querySelectorAll("img")).toHaveLength(3));
  const [added, unsized, custom] = editor.root.querySelectorAll("img");
  expect(added.style.maxWidth).toContain("100px");
  expect(added.style.height).toBe("auto");
  expect(unsized.style.maxWidth).toBe("");
  expect(custom.getAttribute("width")).toBe("81");
  stop();
});

// @vitest-environment jsdom
import { createFieldEditor } from "../ui/field-editor";
import { expect, it, vi } from "vitest";
import "../ui/rich-text-editor.component";
import { fieldImageTarget } from "../ui/field-image-target";
import { imageDraft } from "../ui/image-settings-target";
import { bindImageTransfers } from "../ui/image-transfers";

it("preserves responsive dimensions and bold text when editing only the caption", () => {
  const html = '<img src="https://example.invalid/a.png" style="max-width:100px;width:100%;height:auto"><br><strong>Caption</strong>';
  const editor = createFieldEditor({ content: html });
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  editor.view.dispatch(editor.state.tr.insertText("!"));
  const reopened = createFieldEditor({ content: editor.getHTML() });
  const image = reopened.view.dom.querySelector<HTMLImageElement>("img[src]")!;
  expect(image.style.maxWidth).toBe("100px");
  expect(image.style.width).toBe("100%");
  expect(image.style.height).toBe("auto");
  expect(reopened.view.dom.querySelector("strong")?.textContent).toBe("Caption!");
});

function editorWithTwoImages() {
  const html = '<img src="https://example.invalid/a.png"><a href="https://example.invalid"><img alt="Second" width="81" src="https://example.invalid/a.png"></a><strong>Caption</strong>';
  return createFieldEditor({ content: html, element: document.body.appendChild(document.createElement("div")) });
}

it("edits only the selected occurrence and undoes the change as one action", () => {
  const editor = editorWithTwoImages();
  const before = editor.getJSON();
  const target = fieldImageTarget(editor, "field", editor.view.dom.querySelectorAll<HTMLImageElement>("img[src]")[1]);
  const image = imageDraft(target, target.selected);
  image.alt = "Updated";
  expect(target.commit(target.selected, image)).toBe(true);
  expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.hasAttribute("alt")).toBe(false);
  expect(editor.view.dom.querySelector("a img[src]")?.getAttribute("alt")).toBe("Updated");
  expect(editor.getHTML()).toContain('width="81"');
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

it("rejects a pending edit when its image is removed or editing is disabled", () => {
  const editor = editorWithTwoImages();
  const target = fieldImageTarget(editor, "field");
  const image = imageDraft(target, target.selected);
  editor.setEditable(false);
  expect(target.commit(target.selected, image)).toBe(false);
  editor.setEditable(true);
  editor.commands.deleteRange({ from: 1, to: 2 });
  expect(target.commit(target.selected, image)).toBe(false);
});

it("caps a newly uploaded choice image without touching existing unsized or custom images", async () => {
  const editor = editorWithTwoImages();
  const store = vi.fn().mockResolvedValue("https://example.invalid/b.png");
  const stop = bindImageTransfers(editor, store, { publish: vi.fn(), choiceLabel: true });
  stop.upload({ from: 1, to: 1 }, [new File(["pixels"], "b.png", { type: "image/png" })]);
  await vi.waitFor(() => expect(editor.view.dom.querySelectorAll<HTMLImageElement>("img[src]")).toHaveLength(3));
  const [added, unsized, custom] = fieldImageTarget(editor, "field").images;
  expect(added.style.maxWidth).toContain("100px");
  expect(added.style.height).toBe("auto");
  expect(unsized.style.maxWidth).toBe("");
  expect(custom.getAttribute("width")).toBe("81");
  stop.dispose();
});

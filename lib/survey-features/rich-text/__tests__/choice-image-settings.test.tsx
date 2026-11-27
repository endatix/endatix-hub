import { createRef } from "react";
import type ReactQuill from "react-quill-new";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuestionMatrixDynamicModel } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import { beforeEach, expect, it, vi } from "vitest";
import { ChoiceImageSettings } from "../ui/choice-image-settings";
import { ImageUploadContext, type StoreImage } from "../ui/image-upload-context";
import { UploadableQuill } from "../ui/uploadable-quill";
import "../ui/responsive-image";

const source = "https://example.invalid/sample.png";
const imageFile = new File(["sample pixels"], "sample.png", { type: "image/png" });
const french = `<img src="${source}" alt="One"><img src="${source}" width="50" alt="Two"><strong>Légende</strong>`;

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
});

function setup(store: StoreImage | null = null, props = { choiceLabel: true, readOnly: false }) {
  const creator = new SurveyCreatorModel({});
  creator.JSON = { locale: "fr", elements: [{
    type: "radiogroup", name: "question", choices: [{ value: "key", text: { default: "Caption", fr: french } }, "Plain"],
  }] };
  const editorRef = createRef<ReactQuill>();
  render(<ImageUploadContext.Provider value={store}>
    <ChoiceImageSettings creator={creator}>
      <UploadableQuill editorRef={editorRef} {...props} defaultValue={french} />
    </ChoiceImageSettings>
  </ImageUploadContext.Provider>);
  creator.selectElement(creator.survey.getQuestionByName("question"));
  const matrix = creator.propertyGrid.getQuestionByName("choices");
  if (!(matrix instanceof QuestionMatrixDynamicModel)) throw new Error("Expected the Choices grid");
  const rowAction = (index: number) => creator.propertyGrid
    .getUpdatedMatrixRowActions(matrix, matrix.visibleRows[index], [])
    .find(action => action.id === "choice-image");
  const openRow = (index: number) => act(() => rowAction(index)?.action?.());
  return { creator, matrix, rowAction, openRow, editor: editorRef.current!.getEditor() };
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
}

function upload(file = imageFile) {
  fireEvent.change(screen.getByLabelText(/image file/i), { target: { files: [file] } });
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

it("removes only the second French choice occurrence on Apply and restores it in one Creator undo", () => {
  const { creator, openRow } = setup();
  const choices = () => creator.JSON.pages[0].elements[0].choices;
  const before = choices();
  openRow(0);
  fireEvent.click(screen.getByRole("radio", { name: "2. Two" }));
  click("Remove from this field");
  expect(choices()).toEqual(before);
  click("Cancel");
  expect(choices()).toEqual(before);
  openRow(0);
  fireEvent.click(screen.getByRole("radio", { name: "2. Two" }));
  click("Remove from this field");
  click("Apply");
  expect(choices()[0]).toEqual({value:"key",text:{default:"Caption",fr:`<img src="${source}" alt="One"><strong>Légende</strong>`}});
  creator.undo();
  expect(choices()).toEqual(before);
});

it("shows the last image selected, stages removal reversibly and offers addition after removal", () => {
  const { editor } = setup(null, {choiceLabel:false,readOnly:false});
  editor.setContents(editor.clipboard.convert({html:`<img alt="Harbor" src="${source}">`}));
  const before = editor.getContents();
  click("Image settings");
  expect(screen.getByRole("radio", {name:"1. Harbor"}).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("button",{name:"Add an image"})).toBeTruthy();
  click("Remove from this field");
  click("Keep image");
  expect(screen.getByLabelText<HTMLInputElement>("Alt text").value).toBe("Harbor");
  click("Remove from this field");
  click("Apply");
  expect(editor.root.querySelector("img")).toBeNull();
  click("Image settings");
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByRole("button",{name:"Remove from this field"})).toBeNull();
  expect(screen.getByLabelText("New image file")).toBeTruthy();
  click("Cancel");
  editor.history.undo();
  expect(editor.getContents()).toEqual(before);
});

it("refuses a staged removal when a concurrent caption edit makes the target stale", () => {
  const { editor } = setup();
  fireEvent.click(editor.root.querySelectorAll("img")[1]);
  click("Remove from this field");
  editor.insertText(0, "Later ", "user");
  click("Apply");
  expect(screen.getByRole("alert").textContent).toContain("content changed");
  expect(editor.root.querySelectorAll("img")).toHaveLength(2);
});

it("edits the second French image from the grid without uploading or rewriting the default caption", () => {
  const store = vi.fn<StoreImage>();
  const { creator, openRow } = setup(store);
  openRow(0);
  fireEvent.click(screen.getByRole("radio", {name:"2. Two"}));
  expect(screen.getByLabelText<HTMLInputElement>("Width").value).toBe("50");
  change("Alt text", "Second image");
  change("Width", "240");
  change("Maximum width", "160");
  expect(screen.getByRole("radio", {name:"1. One"}).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Apply or cancel");
  click("Apply");
  const choice = creator.JSON.pages[0].elements[0].choices[0];
  expect(choice.value).toBe("key");
  expect(choice.text.default).toBe("Caption");
  expect(choice.text.fr).toContain('alt="One"');
  expect(choice.text.fr).toContain('alt="Second image"');
  expect(choice.text.fr).toContain("<strong>Légende</strong>");
  expect(store).not.toHaveBeenCalled();
});

it("keeps a plain label while adding an inline image when storage is disabled", async () => {
  const { creator, openRow } = setup();
  openRow(1);
  expect(screen.getByRole("button", { name: "Apply" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByLabelText<HTMLInputElement>("Maximum width").value).toBe("100px");
  upload();
  expect(screen.getByLabelText<HTMLInputElement>("Alt text").value).toBe("sample");
  click("Apply");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const label = creator.JSON.pages[0].elements[0].choices[1].text.fr;
  expect(label).toContain("data:image/png;base64,");
  expect(label).toContain("100px");
  expect(label).toContain("Plain");
});

it("keeps a cleared alt decorative across replacement and reopening", async () => {
  const store = vi.fn<StoreImage>().mockResolvedValue("https://example.invalid/replacement.jpg");
  const { editor } = setup(store);
  fireEvent.click(editor.root.querySelector("img")!);
  change("Alt text", "");
  upload(new File(["pixels"], "Harbor_view.jpg", {type:"image/jpeg"}));
  expect(screen.getByLabelText<HTMLInputElement>("Alt text").value).toBe("");
  click("Apply");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const saved = editor.getSemanticHTML();
  editor.setContents(editor.clipboard.convert({html:saved}));
  const image = editor.root.querySelector("img")!;
  expect(image.getAttribute("alt")).toBe("");
  fireEvent.click(image);
  expect(screen.getByRole("radio", {name:"1. Harbor view"}).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByLabelText<HTMLInputElement>("Alt text").value).toBe("");
  expect(store).toHaveBeenCalledTimes(1);
});

it("retries a failed replacement from Quill, using only the stored reference", async () => {
  const replacement = "https://example.invalid/new.png";
  const store = vi.fn<StoreImage>().mockRejectedValueOnce(Error()).mockResolvedValue(replacement);
  const { editor } = setup(store);
  fireEvent.click(editor.root.querySelectorAll("img")[1]);
  upload();
  click("Apply");
  expect((await screen.findByRole("alert")).textContent).toContain("retry");
  expect(editor.root.querySelectorAll("img")[1].src).toBe(source);
  click("Apply");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const [first, second] = editor.root.querySelectorAll("img");
  expect(first.src).toBe(source);
  expect(second.src).toBe(replacement);
  expect(second.getAttribute("width")).toBe("50");
  expect(store).toHaveBeenCalledTimes(2);
});

it("discards a late upload after the author cancels", async () => {
  const pending = Promise.withResolvers<string>();
  const { editor } = setup(() => pending.promise);
  fireEvent.click(editor.root.querySelector("img")!);
  upload();
  click("Apply");
  expect(screen.getByRole("button", { name: "Applying…" }).hasAttribute("disabled")).toBe(true);
  click("Cancel");
  await act(async () => pending.resolve("https://example.invalid/new.png"));
  expect(editor.root.querySelectorAll("img")).toHaveLength(2);
  expect(editor.root.querySelector("img")?.src).toBe(source);
});

it("uses only the row action for a choice label, while a click selects the exact image", () => {
  const { editor, rowAction } = setup();
  expect(rowAction(0)?.title).toBe("Choice image settings");
  expect(screen.queryByRole("button", { name: "Image settings" })).toBeNull();
  fireEvent.click(editor.root.querySelectorAll("img")[1]);
  expect(screen.getByLabelText<HTMLInputElement>("Alt text").value).toBe("Two");
});

it("opens field settings by icon and image, preserving an uncapped image when changing its alt", async () => {
  const store = vi.fn<StoreImage>();
  const { editor } = setup(store, { choiceLabel: false, readOnly: false });
  const opener = screen.getByRole("button", { name: "Image settings" });
  opener.focus();
  click("Image settings");
  expect(screen.getByRole("radio", {name:"1. One"}).getAttribute("aria-checked")).toBe("true");
  click("Add an image");
  expect(screen.getByLabelText<HTMLInputElement>("Maximum width").value).toBe("");
  screen.getByRole("button", { name: "Cancel" }).focus();
  click("Cancel");
  await waitFor(() => expect(document.activeElement).toBe(opener));
  fireEvent.click(editor.root.querySelector("img")!);
  change("Alt text", "Large image");
  click("Apply");
  const image = editor.root.querySelector("img")!;
  expect(image.alt).toBe("Large image");
  expect(image.style.maxWidth).toBe("");
  expect(image.getAttribute("src")).toBe(source);
  expect(store).not.toHaveBeenCalled();
});

it("offers no image controls in a read-only rich-text field", () => {
  const { editor } = setup(null, { choiceLabel: false, readOnly: true });
  expect(screen.queryByRole("button", { name: "Image settings" })).toBeNull();
  fireEvent.click(editor.root.querySelector("img")!);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("rejects invalid dimensions and a row that became read-only", () => {
  const { matrix, openRow, rowAction } = setup();
  openRow(0);
  change("Maximum width", "-12");
  expect(screen.getByRole("alert").textContent).toContain("positive size");
  expect(screen.getByRole("button", { name: "Apply" }).hasAttribute("disabled")).toBe(true);
  change("Maximum width", "");
  matrix.readOnly = true;
  click("Apply");
  expect(screen.getByRole("alert").textContent).toContain("content changed");
  click("Cancel");
  expect(rowAction(0)).toBeUndefined();
});

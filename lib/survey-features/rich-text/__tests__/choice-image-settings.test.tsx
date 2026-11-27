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
  // jsdom does not implement native modal presentation or blob URL previews.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

function setup(store: StoreImage | null = null) {
  const creator = new SurveyCreatorModel({});
  creator.JSON = { locale: "fr", elements: [{
    type: "radiogroup", name: "question", choices: [{ value: "key", text: { default: "Caption", fr: french } }, "Plain"],
  }] };
  const editorRef = createRef<ReactQuill>();
  render(<ImageUploadContext.Provider value={store}>
    <ChoiceImageSettings creator={creator}>
      <UploadableQuill editorRef={editorRef} choiceLabel defaultValue={french} />
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

function upload() {
  fireEvent.change(screen.getByLabelText("Image file"), { target: { files: [imageFile] } });
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

it("edits the second French image from the grid without uploading or rewriting the default caption", () => {
  const store = vi.fn<StoreImage>();
  const { creator, openRow } = setup(store);
  openRow(0);
  change("Image", "1");
  expect(screen.getByLabelText<HTMLInputElement>("Width").value).toBe("50");
  change("Alt text", "Second image");
  change("Width", "240");
  change("Maximum width", "160");
  fireEvent.click(screen.getByLabelText("Narrow preview"));
  expect(screen.getByAltText("Second image").style.width).toBe("240px");
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
  click("Apply");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const label = creator.JSON.pages[0].elements[0].choices[1].text.fr;
  expect(label).toContain("data:image/png;base64,");
  expect(label).toContain("100px");
  expect(label).toContain("Plain");
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
  click("Image settings");
  upload();
  click("Apply");
  expect(screen.getByRole("button", { name: "Applying…" }).hasAttribute("disabled")).toBe(true);
  click("Cancel");
  await act(async () => pending.resolve("https://example.invalid/new.png"));
  expect(editor.root.querySelectorAll("img")).toHaveLength(2);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
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
  expect(screen.getByRole("alert").textContent).toContain("choice changed");
  click("Cancel");
  expect(rowAction(0)).toBeUndefined();
});

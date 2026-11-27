import { createRef } from "react";
import type ReactQuill from "react-quill-new";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UploadableQuill } from "../ui/uploadable-quill";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { registerRichTextEditorQuestion } from "../ui/rich-text-editor.component";
import { RICH_TEXT_EDITOR_TYPE } from "../ui/rich-text-editor.model";
import { stubResizeObserver } from "@/test/stubs/resize-observer";

it("can open and dismiss formatting on an empty property without writing to the survey", () => {
  // Arrange
  stubResizeObserver();
  registerRichTextEditorQuestion();
  const survey = new Model({ elements: [{ type: RICH_TEXT_EDITOR_TYPE, name: "description" }] });
  let edits = 0;
  survey.onValueChanged.add(() => { edits++; });
  render(<Survey model={survey} />);
  const toggle = screen.getByRole("button", { name: "Formatting options" });

  // Act
  fireEvent.click(toggle);
  const bold = screen.getByRole("button", { name: "Bold" });
  fireEvent.keyDown(bold, { key: "Escape" });

  // Assert
  expect(screen.queryByRole("toolbar")).toBeNull();
  expect(document.activeElement?.getAttribute("contenteditable")).toBe("true");
  expect(edits).toBe(0);
  expect(survey.data).toEqual({});
});

it("opens formatting only on request and closes it when another field takes focus", () => {
  // Arrange
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  const title = createRef<ReactQuill>();
  const description = createRef<ReactQuill>();
  render(<><UploadableQuill editorRef={title} /><UploadableQuill editorRef={description} /></>);
  const field = title.current!.getEditor();
  const other = description.current!.getEditor();

  // Act & Assert
  act(() => field.insertText(0, "Field notes", "user"));
  act(() => field.setSelection(0, 5, "silent"));
  expect(screen.queryByRole("toolbar")).toBeNull();
  const toggle = screen.getAllByRole("button", { name: "Formatting options" })[0];
  act(() => toggle.focus());
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("toolbar")).toBeTruthy();
  expect(field.getText()).toBe("Field notes\n");
  fireEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(field.root.innerHTML).toBe("<p><strong>Field</strong> notes</p>");
  expect(screen.getByRole("button", { name: "Bold" }).getAttribute("aria-pressed")).toBe("true");
  act(() => other.root.focus());
  expect(screen.queryByRole("toolbar")).toBeNull();
});

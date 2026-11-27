import { mountedEditor } from "./field-fixture";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { RichTextField } from "../ui/rich-text-field";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { registerRichTextEditorQuestion } from "../ui/rich-text-editor.component";
import { RICH_TEXT_EDITOR_TYPE } from "../ui/rich-text-editor.model";
import { stubResizeObserver } from "@/test/stubs/resize-observer";

it("mounts resize handles for an authored inline image without rewriting the property", () => {
  // Arrange
  stubResizeObserver();
  registerRichTextEditorQuestion();
  const survey = new Model({ elements: [{ type: RICH_TEXT_EDITOR_TYPE, name: "description" }] });
  const authored = "Chart: <img alt='Chart' width='120' src='https://example.invalid/chart.png'> <strong>North</strong>";
  survey.data = { description: authored };
  const changes: string[] = [];
  survey.onValueChanged.add((_, event) => changes.push(event.value));

  // Act
  const { container } = render(<Survey model={survey} />);

  // Assert
  expect(container.querySelector("[data-resize-handle]")).toBeTruthy();
  expect(changes).toEqual([]);
  expect(survey.data.description).toBe(authored);
});

it("saves new dimensions only for the resized occurrence in legacy source", () => {
  // Arrange
  stubResizeObserver();
  registerRichTextEditorQuestion();
  const survey = new Model({ elements: [{ type: RICH_TEXT_EDITOR_TYPE, name: "description" }] });
  const prefix = "<span class='old'>Legend&nbsp;</span><IMG SRC='https://example.invalid/a.png'> · ";
  const suffix = " <strong title='Compass'>North</strong>";
  survey.data = { description: prefix + "<img src='https://example.invalid/a.png' style='width:25%' alt='Map'>" + suffix };
  render(<Survey model={survey} />);
  const editor = mountedEditor();
  let lastImage = 0;
  editor.state.doc.descendants((node, pos) => { if (node.type.name === "image") lastImage = pos; });

  // Act: the official Image resize handle commits with this transaction.
  act(() => { editor.chain().setNodeSelection(lastImage).updateAttributes("image", { width: 180, height: 90 }).run(); });

  // Assert
  expect(survey.data.description).toMatch(/^.*width="180".*$/);
  expect(survey.data.description.startsWith(prefix)).toBe(true);
  expect(survey.data.description.endsWith(suffix)).toBe(true);
  act(() => { editor.commands.undo(); });
  expect(survey.data.description).toBe(prefix + "<img src='https://example.invalid/a.png' style='width:25%' alt='Map'>" + suffix);
});

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
  render(<><RichTextField /><RichTextField /></>);
  const field = mountedEditor();
  const other = mountedEditor(1);

  // Act & Assert
  act(() => { field.commands.insertContent("Field notes"); });
  act(() => { field.commands.setTextSelection({ from: 1, to: 6 }); });
  expect(screen.queryByRole("toolbar")).toBeNull();
  const toggle = screen.getAllByRole("button", { name: "Formatting options" })[0];
  act(() => toggle.focus());
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("toolbar")).toBeTruthy();
  expect(field.getText()).toBe("Field notes");
  fireEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(field.getHTML()).toBe("<p><strong>Field</strong> notes</p>");
  expect(screen.getByRole("button", { name: "Bold" }).getAttribute("aria-pressed")).toBe("true");
  act(() => other.view.focus());
  expect(screen.queryByRole("toolbar")).toBeNull();
});

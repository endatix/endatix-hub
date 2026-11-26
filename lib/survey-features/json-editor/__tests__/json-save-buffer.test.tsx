import { renderHook } from "@testing-library/react";
import ace from "ace-builds";
import {
  AceJsonEditorModel,
  SurveyCreatorModel,
  type TabJsonEditorAcePlugin,
} from "survey-creator-core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { Result } from "@/lib/result";
import { useJsonEditor } from "../use-json-editor.hook";

beforeEach(stubResizeObserver);

function openEditor() {
  const creator = new SurveyCreatorModel();
  const publish = vi.fn();
  const { result } = renderHook(() =>
    useJsonEditor({ onJsonStateChange: publish }),
  );
  const unregister = result.current.registerJsonEditor(creator);
  creator.activeTab = "json";
  const { model } = creator.getPlugin<TabJsonEditorAcePlugin>("json");
  if (!(model instanceof AceJsonEditorModel))
    throw new Error("Expected the Ace JSON tab");
  const editor = ace.edit(document.createElement("div"));
  model.init(editor);
  const dispose = () => {
    unregister();
    creator.dispose();
    editor.destroy();
  };
  return {
    creator,
    editor,
    hook: result.current,
    publish,
    unregister,
    dispose,
  };
}

let view: ReturnType<typeof openEditor>;
beforeEach(() => {
  view = openEditor();
});
afterEach(() => view.dispose());

it("opens clean but reports a file import as a change", async () => {
  // Arrange
  const { creator, publish } = view;
  const plugin = creator.getPlugin<TabJsonEditorAcePlugin>("json");
  await Promise.resolve();
  expect(publish).not.toHaveBeenCalledWith(
    expect.objectContaining({ isJsonModified: true }),
  );

  // Act
  await new Promise<void>((done) =>
    plugin.importFromFile(new File(['{"title":"Imported"}'], "form.json"), () =>
      done(),
    ),
  );

  // Assert
  expect(publish).toHaveBeenLastCalledWith(
    expect.objectContaining({ isJsonModified: true }),
  );
});

it("recognizes another edit after the submitted text was saved", () => {
  // Arrange
  const { editor, hook, publish } = view;
  editor.setValue('{"title":"First"}');
  expect(publish).toHaveBeenLastCalledWith(
    expect.objectContaining({ isJsonModified: true }),
  );
  const acknowledge = hook.captureJsonSave();

  // Act
  expect(acknowledge()).toBe(true);
  publish.mockClear();
  editor.setValue('{"title":"Second"}');

  // Assert
  expect(publish).toHaveBeenLastCalledWith(
    expect.objectContaining({ isJsonModified: true }),
  );
});

it("keeps a newer edit pending when the previous save completes", () => {
  // Arrange
  const { editor, hook } = view;
  editor.setValue('{"title":"Submitted"}');
  const acknowledge = hook.captureJsonSave();

  // Act
  editor.setValue('{"title":"Edited during save"}');

  // Assert
  expect(acknowledge()).toBe(false);
  expect(hook.getJsonModel(view.creator)).toEqual(
    Result.success({ title: "Edited during save" }),
  );
});

it("keeps the editor usable for retry after invalid JSON is rejected", () => {
  // Arrange
  const { creator, editor, hook } = view;
  editor.setValue("{");

  // Act & Assert
  expect(Result.isError(hook.getJsonModel(creator))).toBe(true);
  editor.setValue('{"title":"Corrected"}');
  expect(hook.getJsonModel(creator)).toEqual(
    Result.success({ title: "Corrected" }),
  );
  expect(hook.captureJsonSave()()).toBe(true);
});

it("disconnects edits and invalidates outstanding saves when the editor is unregistered", () => {
  // Arrange
  const { editor, hook, publish, unregister } = view;
  const acknowledge = hook.captureJsonSave();

  // Act
  unregister();
  publish.mockClear();
  editor.setValue('{"title":"Detached"}');

  // Assert
  expect(publish).not.toHaveBeenCalled();
  expect(acknowledge()).toBe(false);
});

it("allows a Designer save after leaving the JSON tab", () => {
  // Arrange
  const { creator, hook } = view;
  const acknowledgeOldTab = hook.captureJsonSave();

  // Act
  creator.activeTab = "designer";

  // Assert
  expect(acknowledgeOldTab()).toBe(false);
  expect(hook.captureJsonSave()()).toBe(true);
});

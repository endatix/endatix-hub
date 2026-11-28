import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { DesignSurveyProvider, useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";
import { Result } from "@/lib/result";
import { saveActiveDefinitionAction } from "../../../edit-draft/save-active-definition.action";
import { useSaveEditorDocument } from "../../editor/save-editor-document";
import { LegacyEditorSource } from "../legacy-editor-source";

vi.mock("../../../edit-draft/save-active-definition.action", () => ({ saveActiveDefinitionAction: vi.fn() }));
vi.mock("@/features/themes/manage-theme-editor", () => ({ DEFAULT_THEME_ID: "default" }));
vi.mock("@/features/themes/update-form-theme", () => ({ updateFormThemeAction: vi.fn() }));

function Canvas({ title }: { title: string }) {
  const save = useSaveEditorDocument("1");
  const designer = useSurveyDesigner();
  const [text, setText] = useState(title);
  return <>
    <input aria-label="Canvas" value={text} onChange={e => { setText(e.target.value); designer.setHasUnsavedChanges(true); }} />
    <button onClick={() => void save(JSON.stringify({title: text})).catch(() => {})}>Save</button>
  </>;
}

function editor(title: string) {
  return <DesignSurveyProvider>
    <LegacyEditorSource frozen={false} themeModified={false} source={{title}}>
      {json => <Canvas title={(json as {title: string}).title} />}
    </LegacyEditorSource>
  </DesignSurveyProvider>;
}
const type = (text: string) => fireEvent.change(screen.getByLabelText("Canvas"), {target: {value: text}});
function submit(text: string) {
  type(text);
  fireEvent.click(screen.getByRole("button", {name: "Save"}));
}

it("an equivalent refresh before the save completes leaves its acknowledgement available for the later changed source", async () => {
  const request = Promise.withResolvers<Awaited<ReturnType<typeof saveActiveDefinitionAction>>>();
  vi.mocked(saveActiveDefinitionAction).mockReturnValueOnce(request.promise);
  const mounted = render(editor("Old"));
  submit("Submitted");
  type("Newer local work");
  mounted.rerender(editor("Old"));
  await act(async () => request.resolve(Result.success({})));
  mounted.rerender(editor("Submitted"));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByLabelText("Canvas")).toHaveProperty("value", "Newer local work");
  mounted.rerender(editor("Peer edit"));
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it.each(["refused", "threw"])("retires only the %s save when another submission is still outstanding", async reason => {
  const failed = Promise.withResolvers<Awaited<ReturnType<typeof saveActiveDefinitionAction>>>();
  vi.mocked(saveActiveDefinitionAction).mockReturnValueOnce(failed.promise).mockResolvedValueOnce(Result.success({}));
  const mounted = render(editor("Old"));
  submit("Rejected");
  submit("Accepted");
  type("Next edit");
  await act(async () => {
    if (reason === "threw") failed.reject(new Error("Disconnected"));
    else failed.resolve(Result.error("Refused"));
  });
  await waitFor(() => expect(saveActiveDefinitionAction).toHaveBeenCalledTimes(2));
  mounted.rerender(editor("Accepted"));
  expect(screen.queryByRole("dialog")).toBeNull();
  mounted.rerender(editor("Rejected"));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByLabelText("Canvas")).toHaveProperty("value", "Next edit");
});

it("does not mistake a peer revert for a second acknowledgement of identical writes", async () => {
  vi.mocked(saveActiveDefinitionAction).mockResolvedValue(Result.success({}));
  const mounted = render(editor("Original"));
  submit("Identical");
  submit("Identical");
  type("Keep this local edit");
  await waitFor(() => expect(saveActiveDefinitionAction).toHaveBeenCalledTimes(2));
  mounted.rerender(editor("Identical"));
  mounted.rerender(editor("Identical"));
  expect(screen.queryByRole("dialog")).toBeNull();
  mounted.rerender(editor("Peer"));
  fireEvent.click(screen.getByRole("button", {name: "Keep editing my copy"}));
  mounted.rerender(editor("Identical"));
  expect(screen.getByRole("dialog")).toBeTruthy();
});

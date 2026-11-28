import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithBrand } from "@/test/render-with-brand";
import type { EditorSource } from "../../../edit-draft/editor-source.server";
import FormDesignerWrapper from "../form-designer-wrapper";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const assistant = vi.hoisted(() => ({ isAssistantEnabled: false, sendPrompt: vi.fn() }));
beforeEach(() => { assistant.isAssistantEnabled = false; });
vi.mock("../../../use-cases/design-form/form-assistant.context", () => ({ useFormAssistant: () => assistant }));
vi.mock("../../editor/form-editor-with-chat", async () => {
  const { default: ChatBox } = await import("../../chat/chat-box");
  return { default: ({ formJson }: {formJson: {title: string}}) => <><span>{formJson.title}</span><ChatBox placeholder="Unsent request" /></> };
});
vi.mock("../../editor/form-editor-header", () => ({ default: () => null }));
vi.mock("../../editor/use-form-editor-header.hook", () => ({ useFormEditorHeader: () => ({}) }));
vi.mock("../../editor/form-editor-container", () => ({
  default: function Editor({ formJson, onThemeModificationChange }: { formJson: { title: string }; onThemeModificationChange(value: boolean): void }) {
    const {setHasUnsavedChanges} = useSurveyDesigner();
    return <><input aria-label="Canvas" defaultValue={formJson.title} onChange={() => setHasUnsavedChanges(true)} />
      <input aria-label="Theme" defaultValue="Blue" onChange={() => onThemeModificationChange(true)} /></>;
  },
}));
vi.mock("../../../edit-draft/draft-editor-context", async () => ({
  LegacyScope: (await import("react")).createContext(""),
  DraftEditorProvider: ({ head, children }: { head: { jsonData: string }; children: (doc: object) => React.ReactNode }) =>
    <section aria-label="draft writer">{children(JSON.parse(head.jsonData))}</section>,
}));

function source(mode: "draft" | "active", scope: string): EditorSource {
  const doc = { title: `Loaded from ${scope}` };
  if (mode === "active") return { kind: mode, scope, formJson: doc };
  return { kind: mode, scope, userId: "u", head: {
    version: "1", jsonData: JSON.stringify(doc), recordsSinceSnapshot: 0, hasUnpublishedChanges: false, contentHash: "hash",
  } };
}

it.each(["draft", "active"] as const)("preserves the %s editor across cutover but resets it for a different identity", mode => {
  // Arrange
  const otherMode = mode === "draft" ? "active" : "draft";
  const view = (data: EditorSource) => <FormDesignerWrapper source={data} formId="form" formName="Form" />;
  const mounted = render(view(source(mode, "tenant/user/form")));
  const original = screen.getByLabelText("Canvas");
  fireEvent.change(original, { target: { value: "Not yet saved" } });

  // Act & Assert
  mounted.rerender(view(source(otherMode, "tenant/user/form")));
  expect(screen.getByRole("alert").textContent).toContain("editor mode changed");
  expect(screen.getByLabelText("Canvas")).toBe(original);
  expect(original).toHaveProperty("value", "Not yet saved");
  for (const scope of ["otherTenant/user/form", "otherTenant/otherUser/form", "otherTenant/otherUser/otherForm"]) {
    mounted.rerender(view(source(otherMode, scope)));
    expect(screen.getByLabelText("Canvas")).toHaveProperty("value", `Loaded from ${scope}`);
  }
});

it("keeps a theme-only edit mounted when a peer changes the active form", () => {
  const view = (title: string) => <FormDesignerWrapper formId="1" formName="Form" source={{kind: "active", scope: "scope", formJson: {title}}}/>;
  const mounted = render(view("Original"));
  const theme = screen.getByLabelText("Theme");
  fireEvent.change(theme, {target: {value: "Green"}});
  mounted.rerender(view("Peer edit"));
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Keep editing my copy"}));
  expect(screen.getByLabelText("Theme")).toBe(theme);
  expect(theme).toHaveProperty("value", "Green");
});

it("keeps unsent chat text across a clean peer refresh, but never across identities", () => {
  assistant.isAssistantEnabled = true;
  const view = (title: string, scope: string) => <FormDesignerWrapper formId="1" formName="Form" source={{ kind: "active", formJson: {title}, scope }} />;
  const mounted = renderWithBrand(view("Original", "tenant/user/form"));
  fireEvent.change(screen.getByPlaceholderText("Unsent request"), {target: {value: "Unsent prompt"}});
  mounted.rerender(view("Peer edit", "tenant/user/form"));
  expect(screen.getByText("Peer edit")).toBeTruthy();
  expect(screen.getByPlaceholderText("Unsent request")).toHaveProperty("value", "Unsent prompt");
  mounted.rerender(view("Other form", "tenant/user/other-form"));
  expect(screen.getByPlaceholderText("Unsent request")).toHaveProperty("value", "");
  expect(assistant.sendPrompt).not.toHaveBeenCalled();
});

it("adopts a clean active refresh, preserves a later dirty canvas, and loads the peer copy only by choice", () => {
  const view = (title: string) => <FormDesignerWrapper formId="1" formName="Form" source={{kind: "active", scope: "scope", formJson: {title}}}/>;
  const mounted = render(view("Original"));
  mounted.rerender(view("Peer save"));
  const canvas = screen.getByLabelText("Canvas");
  expect(canvas).toHaveProperty("value", "Peer save");
  fireEvent.change(canvas, {target: {value: "Local pending"}});
  mounted.rerender(view("Another peer save"));
  expect(canvas).toHaveProperty("value", "Local pending");
  fireEvent.click(screen.getByRole("button", {name: "Keep editing my copy"}));
  expect(screen.getByLabelText("Canvas")).toBe(canvas);
  mounted.rerender(view("Latest peer save"));
  fireEvent.click(screen.getByRole("button", {name: "Load saved form"}));
  expect(screen.getByLabelText("Canvas")).toHaveProperty("value", "Latest peer save");
});

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { EditorSource } from "../../../edit-draft/editor-source.server";
import FormDesignerWrapper from "../form-designer-wrapper";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../../use-cases/design-form/form-assistant.context", () => ({ useFormAssistant: () => ({ isAssistantEnabled: false }) }));
vi.mock("../../editor/form-editor-with-chat", () => ({ default: () => null }));
vi.mock("../../editor/form-editor-header", () => ({ default: () => null }));
vi.mock("../../editor/use-form-editor-header.hook", () => ({ useFormEditorHeader: () => ({}) }));
vi.mock("../../editor/form-editor-container", () => ({
  default: ({ formJson }: { formJson: { title: string } }) => <input aria-label="Canvas" defaultValue={formJson.title} />,
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

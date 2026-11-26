import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { DocumentEditor } from "../document-editor";
import { editDocument, previewDraft } from "../edit-document.action";

vi.mock("../edit-document.action", () => ({
  editDocument: vi.fn(),
  previewDraft: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  unstable_rethrow: vi.fn(),
}));
const doc = {
  kind: "terms",
  revision: "7",
  required: false,
  publishedNumber: 1,
  draftMarkdown: "# Example",
} as const;

it("reviews the saved text and requires an explicit change before publishing", async () => {
  // Arrange
  vi.mocked(previewDraft).mockResolvedValue(Result.success(doc));
  render(<DocumentEditor document={doc} />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Review and publish" }));
  const publish = await screen.findByRole("button", {
    name: "Publish version",
  });
  // Assert
  expect(publish.hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("heading", { name: "Example" })).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Minor"));
  expect(publish.hasAttribute("disabled")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(editDocument).not.toHaveBeenCalled();
});

it("keeps local text after a stale save and offers a fresh read without replaying it", async () => {
  // Arrange
  vi.mocked(editDocument).mockResolvedValue(
    Result.error("The document changed.", undefined, undefined, {
      statusCode: 409,
    }),
  );
  render(<DocumentEditor document={doc} />);
  // Act
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Synthetic edit" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  // Assert
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("The document changed."));
  expect(screen.getByDisplayValue("Synthetic edit")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reload saved document" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("button", { name: "Save draft" }).hasAttribute("disabled")).toBe(true);
  vi.mocked(previewDraft).mockResolvedValue(
    Result.success({ ...doc, revision: "8", draftMarkdown: "Server edit" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reload saved document" }));
  expect(await screen.findByDisplayValue("Server edit")).toBeTruthy();
  expect(screen.getByText("Synthetic edit")).toBeTruthy();
  expect(editDocument).toHaveBeenCalledTimes(1);
  vi.mocked(previewDraft).mockResolvedValue(Result.success({...doc, revision:"9", draftMarkdown:"New server edit"}));
  fireEvent.click(screen.getByRole("button",{name:"Review and publish"}));
  fireEvent.click(await screen.findByRole("button",{name:"Reload saved document"}));
  expect(await screen.findByDisplayValue("New server edit")).toBeTruthy();
  expect(screen.getByText("Synthetic edit")).toBeTruthy();
});

it("saves local edits against their original revision across a history navigation", async () => {
  // Arrange
  vi.mocked(editDocument).mockResolvedValue(Result.error("Changed"));
  const editor = render(<DocumentEditor document={doc} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Local text" } });
  // Act
  editor.rerender(<DocumentEditor document={{ ...doc, revision: "8", draftMarkdown: "Concurrent edit" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  // Assert
  await screen.findByRole("alert");
  expect(editDocument).toHaveBeenCalledWith({
    kind: "terms",
    operation: "draft",
    revision: "7",
    markdown: "Local text",
  });
});

it("does not open a publish confirmation for a newer saved revision", async () => {
  // Arrange
  vi.mocked(previewDraft).mockResolvedValue(Result.success({ ...doc, revision: "8" }));
  render(<DocumentEditor document={doc} />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Review and publish" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toContain("saved draft changed");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(editDocument).not.toHaveBeenCalled();
});

it("keeps the reviewed change available after an ordinary publication failure", async () => {
  // Arrange
  vi.mocked(previewDraft).mockResolvedValue(Result.success(doc));
  vi.mocked(editDocument).mockResolvedValue(Result.error("Service is busy.", undefined, undefined, { statusCode: 429 }));
  render(<DocumentEditor document={doc} />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Review and publish" }));
  fireEvent.click(await screen.findByLabelText("Material"));
  fireEvent.click(screen.getByRole("button", { name: "Publish version" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toContain("Service is busy.");
  expect(screen.getByRole("dialog").contains(screen.getByRole("alert"))).toBe(true);
  expect(editDocument).toHaveBeenCalledWith({
    kind: "terms",
    revision: "7",
    operation: "publish",
    change: "material",
  });
});

it.each([undefined, 200, 503])("requires a fresh read after an unconfirmed publish (%s)", async statusCode => {
  // Arrange
  vi.mocked(previewDraft).mockResolvedValue(Result.success(doc));
  vi.mocked(editDocument).mockResolvedValue(Result.error("Connection lost", undefined, undefined, { statusCode }));
  render(<DocumentEditor document={doc} />);
  // Act
  fireEvent.click(screen.getByRole("button", {name:"Review and publish"}));
  fireEvent.click(await screen.findByLabelText("Minor"));
  fireEvent.click(screen.getByRole("button",{name:"Publish version"}));
  // Assert
  expect(await screen.findByRole("button",{name:"Reload saved document"})).toBeTruthy();
  expect(screen.getByRole("button",{name:"Publish version"}).hasAttribute("disabled")).toBe(true);
  expect(editDocument).toHaveBeenCalledTimes(1);
});

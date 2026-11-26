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
});

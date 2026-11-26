import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CreateTemplateForm from "@/app/(main)/forms/templates/create/create-template-form";
import { Result } from "@/lib/result";

const { context, create, router } = vi.hoisted(() => ({
  context: vi.fn(),
  create: vi.fn(),
  router: { push: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock(
  "@/features/form-templates/application/get-template-create-context.action",
  () => ({
    getTemplateCreateContextAction: context,
  }),
);
vi.mock("@/features/form-templates/application/create-template.action", () => ({
  createTemplateAction: create,
}));
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn() } }));

it("opens the admitted template form without creating anything and explains a missing required folder", async () => {
  // Arrange
  context.mockResolvedValue(
    Result.success({ requireFolderAssignment: true, folders: [] }),
  );

  // Act
  render(<CreateTemplateForm />);

  // Assert
  expect(await screen.findByText(/no active folders exist/i)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Cancel" }).getAttribute("href"),
  ).toBe("/forms/templates");
  expect(create).not.toHaveBeenCalled();
});

it.each([false, true])(
  "shows the admitted folder picker with required assignment set to %s",
  async (required) => {
    // Arrange
    context.mockResolvedValue(
      Result.success({
        requireFolderAssignment: required,
        folders: [{ id: "7", name: "Templates" }],
      }),
    );

    // Act
    render(<CreateTemplateForm />);

    // Assert
    const picker = await screen.findByRole("combobox");
    expect(picker.textContent).toMatch(
      required ? /Select a folder/ : /No folder/,
    );
    expect(create).not.toHaveBeenCalled();
  },
);

it("retains the chosen folder after a refused submission, then opens the created template after a successful retry", async () => {
  // Arrange
  context.mockResolvedValue(
    Result.success({
      requireFolderAssignment: true,
      folders: [{ id: "7", name: "Templates" }],
    }),
  );
  create
    .mockImplementationOnce(async (_previous, submitted: FormData) => ({
      isSuccess: false,
      data: {
        name: submitted.get("name"),
        folderId: submitted.get("folderId"),
      },
      formErrors: ["Review the details"],
      errors: { name: ["Choose another name"], folderId: ["Check the folder"] },
    }))
    .mockResolvedValueOnce({ isSuccess: true, templateId: "45" });
  render(<CreateTemplateForm />);
  Element.prototype.scrollIntoView ??= () => undefined;
  fireEvent.keyDown(await screen.findByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Templates" }));

  // Act
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Example" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

  // Assert
  expect(await screen.findByText("Review the details")).toBeTruthy();
  expect(create.mock.calls[0][1].get("folderId")).toBe("7");
  expect(screen.getByText("Choose another name")).toBeTruthy();
  expect(screen.getByText("Check the folder")).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith("/forms/templates/45"),
  );
  expect(create.mock.calls[1][1].get("folderId")).toBe("7");
});

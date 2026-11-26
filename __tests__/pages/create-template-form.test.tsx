import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CreateFormTemplatePage from "@/app/(main)/forms/templates/create/page";
import { Result } from "@/lib/result";
import { renderToString } from "react-dom/server";

const { context, create, router } = vi.hoisted(() => ({
  context: vi.fn(),
  create: vi.fn(),
  router: { push: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ requireHubAccess: async () => undefined }),
}));
vi.mock("@/features/auth/required-actions/workspace-redirect.server", () => ({
  admitWorkspacePage: async (guard: Promise<void>) => guard,
}));
vi.mock("@/features/onboarding/server", () => ({
  withWorkspaceSetupAfter: (_admitted: boolean, content: React.ReactNode) =>
    content,
}));
vi.mock("next/navigation", async (original) => ({
  ...(await original<object>()),
  useRouter: () => router,
  usePathname: () => "/forms/templates/create",
}));
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

function folderContext(requireFolderAssignment: boolean) {
  return Result.success({
    requireFolderAssignment,
    folders: [{ id: "7", name: "Templates" }],
  });
}

it("keeps submit disabled before hydration without announcing a write", async () => {
  // Arrange
  context.mockResolvedValue(folderContext(false));
  const page = await CreateFormTemplatePage();

  // Act
  const document = new DOMParser().parseFromString(
    renderToString(page),
    "text/html",
  );
  const submit = document.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );

  // Assert
  expect(submit?.disabled).toBe(true);
  expect(submit?.textContent).toBe("Create Template");
  render(page);
  expect(pendingButton("Create Template").disabled).toBe(false);
});

it.each([
  [403, "You do not have permission to perform this action."],
  [503, "This service is temporarily unavailable."],
] as const)(
  "shows the %i read failure with a safe retry",
  async (statusCode, title) => {
    // Arrange
    context.mockResolvedValue(
      Result.error("Read failed", undefined, undefined, { statusCode }),
    );

    // Act
    render(await CreateFormTemplatePage());

    // Assert
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Create Template" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  },
);

it("opens the admitted template form without creating anything and explains a missing required folder", async () => {
  // Arrange
  context.mockResolvedValue(
    Result.success({ requireFolderAssignment: true, folders: [] }),
  );

  // Act
  render(await CreateFormTemplatePage());

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
    context.mockResolvedValue(folderContext(required));

    // Act
    render(await CreateFormTemplatePage());

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
  context.mockResolvedValue(folderContext(true));
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
  render(await CreateFormTemplatePage());
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

function pendingButton(name: string | RegExp) {
  return screen.getByRole<HTMLButtonElement>("button", { name });
}

it("locks submission during creation and navigation, but unlocks after a refused write", async () => {
  // Arrange
  context.mockResolvedValue(folderContext(false));
  const pending = Promise.withResolvers<{
    isSuccess: false;
    data: { name: string };
  }>();
  create
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ isSuccess: true, templateId: "45" });
  render(await CreateFormTemplatePage());
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Example" },
  });

  // Act
  fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
  const busy = pendingButton(/creating/i);
  fireEvent.click(busy);

  // Assert
  expect(busy.disabled).toBe(true);
  expect(screen.queryByRole("link", { name: /back to templates/i })).toBeNull();
  expect(pendingButton("Cancel").disabled).toBe(true);
  expect(create).toHaveBeenCalledTimes(1);
  await act(async () =>
    pending.resolve({ isSuccess: false, data: { name: "Example" } }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith("/forms/templates/45"),
  );
  expect(pendingButton(/creating/i).disabled).toBe(true);
  expect(pendingButton("Cancel").disabled).toBe(true);
  expect(create).toHaveBeenCalledTimes(2);
});

it("does not create again for a submission queued behind a successful create", async () => {
  // Arrange
  context.mockResolvedValue(folderContext(false));
  const pending = Promise.withResolvers<{
    isSuccess: true;
    templateId: string;
  }>();
  create.mockReturnValue(pending.promise);
  render(await CreateFormTemplatePage());
  const form = screen.getByRole<HTMLButtonElement>("button", {
    name: "Create Template",
  }).form!;

  // Act
  act(() => {
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
  await act(async () => pending.resolve({ isSuccess: true, templateId: "45" }));

  // Assert
  expect(create).toHaveBeenCalledOnce();
  expect(router.push).toHaveBeenCalledWith("/forms/templates/45");
});

it("does not replay an overlapping submission after the first write is refused", async () => {
  // Arrange
  const pending = Promise.withResolvers<{
    isSuccess: false;
    formErrors: string[];
  }>();
  create.mockReturnValueOnce(pending.promise);
  context.mockResolvedValue(folderContext(false));
  render(await CreateFormTemplatePage());
  const form = pendingButton("Create Template").form!;

  // Act
  act(() => {
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
  await act(async () =>
    pending.resolve({ isSuccess: false, formErrors: ["Try another name"] }),
  );

  // Assert
  expect(screen.getByText("Try another name")).toBeTruthy();
  expect(pendingButton("Create Template").disabled).toBe(false);
  expect(create).toHaveBeenCalledOnce();
});

it("unlocks without retrying when the create response is lost", async () => {
  // Arrange
  create.mockRejectedValueOnce(new Error("Connection lost"));
  context.mockResolvedValue(folderContext(false));
  render(await CreateFormTemplatePage());
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "My template" },
  });
  fireEvent.change(screen.getByLabelText(/Description/), {
    target: { value: "Draft description" },
  });

  // Act
  fireEvent.submit(pendingButton("Create Template").form!);

  // Assert
  expect(await screen.findByText(/could not confirm creation/i)).toBeTruthy();
  expect(pendingButton("Create Template").disabled).toBe(false);
  expect(create).toHaveBeenCalledOnce();
  expect(router.push).not.toHaveBeenCalled();
  create.mockResolvedValueOnce({ isSuccess: true, templateId: "46" });
  fireEvent.click(pendingButton("Create Template"));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith("/forms/templates/46"),
  );
  expect(create.mock.calls[1][1].get("name")).toBe("My template");
  expect(create.mock.calls[1][1].get("description")).toBe("Draft description");
});

it("does not navigate a new visit when an abandoned create completes", async () => {
  // Arrange
  context.mockResolvedValue(folderContext(false));
  const pending = Promise.withResolvers<{
    isSuccess: true;
    templateId: string;
  }>();
  create.mockReturnValueOnce(pending.promise);
  const first = render(await CreateFormTemplatePage());
  fireEvent.submit(pendingButton("Create Template").form!);

  // Act
  first.unmount();
  render(await CreateFormTemplatePage());
  await act(async () => pending.resolve({ isSuccess: true, templateId: "45" }));

  // Assert
  expect(router.push).not.toHaveBeenCalled();
  expect(pendingButton("Create Template").disabled).toBe(false);
});

it("opens the saved template even when a context refresh replaces the submitting form", async () => {
  // Arrange
  context.mockResolvedValue(folderContext(false));
  const pending = Promise.withResolvers<{
    isSuccess: true;
    templateId: string;
  }>();
  create.mockReturnValueOnce(pending.promise);
  const view = render(await CreateFormTemplatePage());
  fireEvent.submit(pendingButton("Create Template").form!);
  context.mockResolvedValue(
    Result.error("Unavailable", undefined, undefined, { statusCode: 503 }),
  );

  // Act
  view.rerender(await CreateFormTemplatePage());
  expect(
    screen.getByRole("heading", {
      name: "This service is temporarily unavailable.",
    }),
  ).toBeTruthy();
  await act(async () => pending.resolve({ isSuccess: true, templateId: "45" }));

  // Assert
  expect(router.push).toHaveBeenCalledWith("/forms/templates/45");
  expect(create).toHaveBeenCalledOnce();
});

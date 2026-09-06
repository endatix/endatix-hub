import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createNextNavigationMock } from "@/__tests__/utils/mock-next";
import { getTenantSettingsAction } from "@/features/forms/application/actions/get-tenant-settings.action";
import { Result } from "@/lib/result";
import type { Folder } from "@/lib/endatix-api/folders/types";
import type { FormTemplate } from "@/types";
import { CreateFormSheet } from "../create-form-sheet";

vi.mock("next/navigation", () =>
  createNextNavigationMock({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
    usePathname: vi.fn(() => "/forms"),
  }),
);

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../create-form.action", () => ({
  createFormAction: vi.fn(),
}));

vi.mock("@/features/forms/application/actions/get-tenant-settings.action", () => ({
  getTenantSettingsAction: vi.fn(),
}));

vi.mock("@/features/folders/server", () => ({
  listFoldersAction: vi.fn(),
  getFolderBySlugAction: vi.fn(),
}));

vi.mock("@/features/form-templates/application/run-create-form-from-template.client", () => ({
  runCreateFormFromTemplate: vi.fn(),
}));

vi.mock("@/features/form-templates/ui/form-template-preview", () => ({
  FormTemplatePreview: () => null,
}));

vi.mock("../create-form-assistant-panel", () => ({
  CreateFormAssistantPanel: () => null,
}));

vi.mock("@/features/forms/use-cases/design-form/use-auto-create-form.hook", () => ({
  useAutoCreateForm: () => ({ isCreatingForm: false }),
}));

vi.mock("@/features/forms/use-cases/design-form/form-assistant.context", () => ({
  useFormAssistant: () => ({
    isAssistantEnabled: false,
    chatContext: null,
    sendPrompt: vi.fn(),
    generateAssociatedForm: vi.fn(),
    requireFolderForNewForms: false,
    assignableFolders: [],
    assignFolderId: undefined,
    setAssignFolderId: vi.fn(),
  }),
}));

vi.mock("@/features/forms/ui/template-selector", () => ({
  default: function TemplateSelectorMock({
    onTemplateSelect,
  }: {
    onTemplateSelect: (template: FormTemplate) => void;
  }) {
    return (
      <button
        type="button"
        onClick={() =>
          onTemplateSelect({
            id: "tmpl-1",
            name: "Marketing survey",
            folderId: "2",
            createdAt: new Date("2026-01-01"),
          })
        }
      >
        Pick Marketing template
      </button>
    );
  },
}));

const getTenantSettingsActionMock = vi.mocked(getTenantSettingsAction);

const folders: Folder[] = [
  {
    id: "1",
    name: "Oggy's tests",
    slug: "oggys-tests",
    isActive: true,
    immutable: false,
  },
  {
    id: "2",
    name: "Marketing",
    slug: "marketing",
    isActive: true,
    immutable: false,
  },
];

function renderSheet() {
  return render(
    <CreateFormSheet
      defaultFolderId="1"
      defaultFolderName="Oggy's tests"
      initialFolders={folders}
    />,
  );
}

async function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: /create a form/i }));
  return screen.findByRole("dialog", { name: "Create a Form" });
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  getTenantSettingsActionMock.mockResolvedValue(
    Result.success({
      tenantId: "1",
      isSubmissionTokenValidAfterCompletion: false,
      requireFolderAssignment: false,
    }),
  );
});

describe("CreateFormSheet", () => {
  it("closes when Cancel is clicked on the from-scratch step", async () => {
    // Arrange
    renderSheet();
    await openSheet();
    fireEvent.click(screen.getByText("Start from Scratch"));
    expect(await screen.findByRole("button", { name: "Cancel" })).toBeTruthy();

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("returns to the options grid when the sheet is reopened", async () => {
    // Arrange
    renderSheet();
    await openSheet();
    fireEvent.click(screen.getByText("Start from Scratch"));
    expect(await screen.findByLabelText("Name")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // Act
    await openSheet();

    // Assert
    expect(screen.getByText("Start from Scratch")).toBeTruthy();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("restores the default folder after a template folder was selected", async () => {
    // Arrange
    renderSheet();
    await openSheet();
    fireEvent.click(screen.getByText("Create from a Template"));
    fireEvent.click(screen.getByRole("button", { name: "Pick Marketing template" }));
    expect(screen.getByRole("combobox").textContent).toContain("Marketing");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // Act
    await openSheet();
    fireEvent.click(screen.getByText("Create from a Template"));

    // Assert
    expect(screen.queryByRole("button", { name: "Create Form from Template" })).toBeNull();
    expect(screen.getByRole("combobox").textContent).toContain("Oggy's tests");
  });
});

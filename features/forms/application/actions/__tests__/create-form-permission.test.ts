import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { createForm, getFormTemplate } from "@/services/api";
import { createFormAction } from "../create-form.action";
import { createFormFromTemplateAction } from "../create-form-from-template.action";
import { createFormAction as createFormFromWizardAction } from "@/features/forms/use-cases/create-form/create-form.action";
import { generateFormForConversationAction } from "@/features/forms/use-cases/design-form/generate-form-for-conversation.action";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/authorization")>();
  return { ...actual, authorization: vi.fn() };
});

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  return { ...actual, EndatixApi: vi.fn() };
});

vi.mock("@/services/api", () => ({
  createForm: vi.fn(),
  getFormTemplate: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const REDIRECT = new Error("NEXT_REDIRECT");

describe("create form actions without forms.create", () => {
  const apiCreate = vi.fn();
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);
  const requirePermission = vi.fn().mockRejectedValue(REDIRECT);

  beforeEach(() => {
    vi.clearAllMocks();
    requireHubAccess.mockResolvedValue(undefined);
    requirePermission.mockRejectedValue(REDIRECT);
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess,
      requirePermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { forms: { create: apiCreate } } as never;
    });
  });

  function expectRefusedBeforeCreate() {
    expect(requirePermission).toHaveBeenCalledWith(Permissions.Forms.Create);
    expect(apiCreate).not.toHaveBeenCalled();
    expect(createForm).not.toHaveBeenCalled();
    expect(getFormTemplate).not.toHaveBeenCalled();
  }

  it("refuses a create request", async () => {
    // Act
    const action = createFormAction({
      name: "Form",
      isEnabled: true,
      formDefinitionJsonData: "{}",
    });

    // Assert
    await expect(action).rejects.toBe(REDIRECT);
    expectRefusedBeforeCreate();
  });

  it("refuses a create from a template", async () => {
    // Act
    const action = createFormFromTemplateAction({ templateId: "template-1" });

    // Assert
    await expect(action).rejects.toBe(REDIRECT);
    expectRefusedBeforeCreate();
  });

  it("refuses the create form wizard", async () => {
    // Arrange
    const formData = new FormData();
    formData.set("name", "Form");

    // Act
    const action = createFormFromWizardAction({ isSuccess: false }, formData);

    // Assert
    await expect(action).rejects.toBe(REDIRECT);
    expectRefusedBeforeCreate();
  });

  it("refuses a form generated from an assistant conversation", async () => {
    // Act
    const action = generateFormForConversationAction({
      formTitle: "Form",
      formDefinitionSchema: {},
      conversationId: "conversation-1",
      agentId: "agent-1",
    });

    // Assert
    await expect(action).rejects.toBe(REDIRECT);
    expectRefusedBeforeCreate();
  });
});

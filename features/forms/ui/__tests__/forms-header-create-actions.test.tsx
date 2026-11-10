import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { FormsHeaderCreateActions } from "../forms-header-create-actions";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/authorization")>();
  return { ...actual, authorization: vi.fn() };
});

vi.mock("@/features/forms/use-cases/create-form", () => ({
  CreateFormSheet: () => <button type="button">Create a form</button>,
}));

vi.mock("@/features/asset-storage/server", () => ({
  AssetStorageProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock(
  "@/features/forms/use-cases/design-form/form-assistant.context",
  () => ({
    FormAssistantProvider: ({ children }: { children: ReactNode }) => children,
  }),
);

describe("FormsHeaderCreateActions", () => {
  const checkPermission = vi.fn();
  const props = {
    aiFeatureFlag: false,
    headerData: { requireFolderForNewForms: false },
  } as Parameters<typeof FormsHeaderCreateActions>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({ checkPermission } as never);
  });

  it("renders nothing without forms.create", async () => {
    // Arrange
    checkPermission.mockResolvedValue(
      AuthorizationResult.forbidden("No forms.create"),
    );

    // Act
    const element = await FormsHeaderCreateActions(props);

    // Assert
    expect(checkPermission).toHaveBeenCalledWith(Permissions.Forms.Create);
    expect(element).toBeNull();
  });

  it("renders the create actions with forms.create", async () => {
    // Arrange
    checkPermission.mockResolvedValue(AuthorizationResult.success());

    // Act
    render(await FormsHeaderCreateActions(props));

    // Assert
    expect(screen.getByRole("button", { name: "Create a form" })).toBeDefined();
  });
});

import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
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

vi.mock("@/features/folders/view-forms-header", () => ({
  getFormsHeaderDataCached: vi.fn().mockResolvedValue({ folders: [] }),
}));

vi.mock("@/features/asset-storage/server", () => ({
  AssetStorageProvider: ({ children }: { children: ReactNode }) => children,
}));

/** Collects canCreateForms from every element in a server page's tree that carries it. */
function canCreateFormsProps(node: ReactNode): boolean[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => canCreateFormsProps(child));
  }
  if (!isValidElement(node)) {
    return [];
  }
  const props = node.props as {
    canCreateForms?: boolean;
    children?: ReactNode;
  };
  const own = props.canCreateForms === undefined ? [] : [props.canCreateForms];
  return [...own, ...canCreateFormsProps(props.children)];
}

describe("form templates pages", () => {
  const checkPermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess: vi.fn().mockResolvedValue(undefined),
      checkPermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        folders: {
          getBySlug: vi.fn().mockResolvedValue({
            success: true,
            data: { id: "folder-1", name: "Folder", slug: "folder" },
          }),
        },
        formTemplates: {
          list: vi.fn().mockResolvedValue({ success: true, data: [] }),
        },
        tenant: {
          getSettings: vi.fn().mockResolvedValue({
            success: true,
            data: { requireFolderAssignment: false },
          }),
        },
      } as never;
    });
  });

  it.each([true, false])(
    "templates page passes canCreateForms=%s from forms.create",
    async (granted) => {
      // Arrange
      checkPermission.mockResolvedValue({ success: granted });
      const { default: FormTemplatesPage } =
        await import("@/app/(main)/forms/templates/page");

      // Act
      const tree = await FormTemplatesPage();

      // Assert
      expect(checkPermission).toHaveBeenCalledWith(Permissions.Forms.Create);
      expect(canCreateFormsProps(tree)).toEqual([granted]);
    },
  );

  it.each([true, false])(
    "template folder page passes canCreateForms=%s from forms.create",
    async (granted) => {
      // Arrange
      checkPermission.mockResolvedValue({ success: granted });
      const { default: TemplateFolderSlugPage } =
        await import("@/app/(main)/forms/templates/folders/[folderSlug]/page");

      // Act
      const tree = await TemplateFolderSlugPage({
        params: Promise.resolve({ folderSlug: "folder" }),
      });

      // Assert
      expect(checkPermission).toHaveBeenCalledWith(Permissions.Forms.Create);
      expect(canCreateFormsProps(tree)).toEqual([granted]);
    },
  );
});

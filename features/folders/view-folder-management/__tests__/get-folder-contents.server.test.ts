import { beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "@/lib/endatix-api";
import type { Form, FormTemplate } from "@/types";
import { getFolderContents } from "../get-folder-contents.server";

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  return {
    ...actual,
    EndatixApi: vi.fn(),
  };
});

const sampleForms: Form[] = [
  {
    id: "form-1",
    name: "Survey",
    folderId: "folder-1",
    isEnabled: true,
    isPublic: false,
    createdAt: new Date("2024-01-01"),
    modifiedAt: new Date("2024-01-02"),
  },
];

const sampleTemplates: FormTemplate[] = [
  {
    id: "template-1",
    name: "Template",
    folderId: "folder-1",
    createdAt: new Date("2024-01-01"),
    modifiedAt: new Date("2024-01-02"),
  },
];

describe("getFolderContents", () => {
  const listForms = vi.fn();
  const listTemplates = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        forms: { list: listForms },
        formTemplates: { list: listTemplates },
      } as never;
    });
  });

  it("returns forms and templates when both API calls succeed", async () => {
    listForms.mockResolvedValue({
      success: true,
      data: { items: sampleForms, totalRecords: 1 },
    });
    listTemplates.mockResolvedValue({
      success: true,
      data: sampleTemplates,
    });

    const result = await getFolderContents("token", "folder-1");

    expect(listForms).toHaveBeenCalledWith({ folderId: "folder-1" });
    expect(listTemplates).toHaveBeenCalledWith({ folderId: "folder-1" });
    expect(result).toEqual({
      ok: true,
      data: {
        forms: sampleForms,
        templates: sampleTemplates,
      },
    });
  });

  it("returns auth error when forms lookup fails with auth", async () => {
    listForms.mockResolvedValue({
      success: false,
      error: { type: "AuthError", message: "Unauthorized" },
    });

    const result = await getFolderContents("token", "folder-1");

    expect(result).toEqual({ ok: false, error: { kind: "auth" } });
  });

  it("returns api error when templates lookup fails", async () => {
    listForms.mockResolvedValue({
      success: true,
      data: { items: sampleForms, totalRecords: 1 },
    });
    listTemplates.mockResolvedValue({
      success: false,
      error: { type: "ServerError", message: "Server unavailable" },
    });

    const result = await getFolderContents("token", "folder-1");

    expect(result).toEqual({
      ok: false,
      error: { kind: "api", message: "Server unavailable" },
    });
  });
});

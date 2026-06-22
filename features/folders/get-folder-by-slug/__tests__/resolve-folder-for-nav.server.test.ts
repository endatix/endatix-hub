import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormsNavFolder } from "@/features/folders/types";
import { EndatixApi } from "@/lib/endatix-api";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { resolveFolderForNavBySlug } from "../resolve-folder-for-nav.server";

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
}));

const navFolders: FormsNavFolder[] = [
  {
    id: "1",
    name: "Marketing",
    slug: "marketing",
    isActive: true,
    immutable: false,
  },
];

const apiFolder: Folder = {
  id: "99",
  name: "Archive",
  slug: "archive",
  isActive: false,
  immutable: true,
};

describe("resolveFolderForNavBySlug", () => {
  const getBySlug = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        folders: {
          getBySlug,
        },
      } as never;
    });
  });

  it("returns folder from preloaded list without calling API", async () => {
    // Act
    const result = await resolveFolderForNavBySlug(
      "token",
      "Marketing",
      navFolders,
    );

    // Assert
    expect(getBySlug).not.toHaveBeenCalled();
    expect(result).toEqual(navFolders[0]);
  });

  it("falls back to API and maps to nav folder shape", async () => {
    // Arrange
    getBySlug.mockResolvedValue({
      success: true,
      data: apiFolder,
    });

    // Act
    const result = await resolveFolderForNavBySlug(
      "token",
      "archive",
      navFolders,
    );

    // Assert
    expect(getBySlug).toHaveBeenCalledWith("archive");
    expect(result).toEqual({
      id: "99",
      name: "Archive",
      slug: "archive",
      isActive: false,
      immutable: true,
    });
  });

  it("returns null when API lookup fails", async () => {
    // Arrange
    getBySlug.mockResolvedValue({
      success: false,
      error: {
        type: "NotFoundError",
        message: "Folder not found",
      },
    });

    // Act
    const result = await resolveFolderForNavBySlug(
      "token",
      "missing",
      navFolders,
    );

    // Assert
    expect(result).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import LegalPage from "@/app/(main)/admin/legal/page";
import { EndatixApi } from "@/lib/endatix-api";

const { enabled, guard, get } = vi.hoisted(() => ({ enabled: vi.fn(), guard: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/feature-flags/flags", () => ({ termsAcceptanceEnabled: enabled }));
vi.mock("@/features/platform-admin/server", () => ({ requirePlatformAdmin: guard }));
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    get = get;
  },
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("Not found");
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/features/legal/manage-documents/edit-document.action", () => ({
  editDocument: vi.fn(),
  previewDraft: vi.fn(),
}));
vi.mock("@/features/legal/manage-documents/version-history", () => ({ VersionHistory: () => null }));
vi.mock("@/features/platform-admin/ui/platform-admin-shell", () => ({
  PlatformAdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
const doc = { kind: "privacy", revision: "0", publishedNumber: 0, draftMarkdown: null, required: false };
beforeEach(() => {
  enabled.mockResolvedValue(true);
  guard.mockResolvedValue({ accessToken: "fixture" });
});

it("does not load drafts when legal management is disabled", async () => {
  // Arrange
  enabled.mockResolvedValue(false);
  // Act & Assert
  await expect(LegalPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Not found");
  expect(notFound).toHaveBeenCalled();
  expect(get).not.toHaveBeenCalled();
});

it("does not read document data before ordinary platform authorization", async () => {
  // Arrange
  guard.mockRejectedValueOnce(new Error("Forbidden"));
  // Act & Assert
  await expect(LegalPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Forbidden");
  expect(get).not.toHaveBeenCalled();
});

it("does not display a Required control for Privacy, even when Terms also exists", async () => {
  // Arrange
  get.mockResolvedValueOnce({ success: true, data: [{ ...doc, kind: "terms" }, doc] });
  const page = await LegalPage({ searchParams: Promise.resolve({ kind: "privacy" }) });
  // Act
  render(page);
  // Assert
  expect(screen.getByRole("heading", { name: "Privacy notice" })).toBeTruthy();
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.getByRole("button", { name: "Review and publish" }).hasAttribute("disabled")).toBe(true);
});

it("shows the requested read-only history page with its publisher, date and navigation", async () => {
  // Arrange
  const { VersionHistory } = await vi.importActual<
    typeof import("@/features/legal/manage-documents/version-history")
  >("@/features/legal/manage-documents/version-history");
  get.mockResolvedValueOnce({
    success: true,
    data: {
      page: 2,
      pageSize: 10,
      totalRecords: 22,
      totalPages: 3,
      items: [
        {
          id: "25",
          number: 12,
          change: "minor",
          markdown: "Synthetic draft",
          publishedAt: "2026-11-01T10:00:00Z",
          publishedByUserId: "9007199254740993",
        },
      ],
    },
  });
  // Act
  render(await VersionHistory({ api: new EndatixApi(), kind: "terms", page: 2 }));
  // Assert
  expect(get).toHaveBeenCalledWith("/admin/legal/documents/terms/versions?page=2&pageSize=10");
  expect(screen.getByText(/published by user 9007199254740993/)).toBeTruthy();
  expect(screen.getByText("2026-11-01T10:00:00Z")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Next versions page" }).getAttribute("href")).toBe(
    "/admin/legal?kind=terms&page=3",
  );
  expect(screen.queryByRole("button")).toBeNull();
});

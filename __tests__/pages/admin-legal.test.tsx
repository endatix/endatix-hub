import { fireEvent, render, screen } from "@testing-library/react";
import { PagedListUrlProvider } from "@/components/table/paged-list-url-provider";
import { beforeEach, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import LegalPage from "@/app/(main)/admin/legal/page";
import { EndatixApi } from "@/lib/endatix-api";

const { enabled, guard, get, replace } = vi.hoisted(() => ({ enabled: vi.fn(), guard: vi.fn(), get: vi.fn(), replace: vi.fn() }));
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
  useRouter: () => ({ refresh: vi.fn(), replace }),
  usePathname: () => "/admin/legal",
  useSearchParams: () => new URLSearchParams(window.location.search),
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

const publication = {
  id: "25",
  number: 12,
  change: "minor",
  markdown: "Synthetic draft",
  publishedAt: "2026-11-01T10:00:00.1234567+00:00",
  publishedByUserId: "9007199254740993",
};
const emptyPage = { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0, items: [] };
const historyPage = {
  page: 2, pageSize: 10, totalRecords: 22, totalPages: 3,
  items: [publication],
};

async function renderHistory(data: unknown, page = 2) {
  const { VersionHistory } = await vi.importActual<
    typeof import("@/features/legal/manage-documents/version-history")
  >("@/features/legal/manage-documents/version-history");
  get.mockResolvedValueOnce({ success: true, data });
  window.history.replaceState(null, "", `/admin/legal?kind=terms&page=${page}`);
  render(<PagedListUrlProvider>{await VersionHistory({ api: new EndatixApi(), kind: "terms", paging: { page } })}</PagedListUrlProvider>);
}

it("shows the requested read-only history page with its publisher, date and navigation", async () => {
  // Act
  await renderHistory(historyPage);
  // Assert
  expect(get).toHaveBeenCalledWith("/admin/legal/documents/terms/versions?page=2&pageSize=10");
  expect(screen.getByText(/Version 12 · minor · published by user 9007199254740993/)).toBeTruthy();
  expect(screen.getByText(publication.publishedAt).getAttribute("datetime")).toBe(publication.publishedAt);
  fireEvent.click(screen.getByRole("button", {name:"Go to next page"}));
  expect(replace).toHaveBeenCalledWith("/admin/legal?kind=terms&page=3",{scroll:false});
  expect(screen.queryByRole("button", {name:/edit|publish|delete/i})).toBeNull();
});

it("shows the empty state for a genuine empty history page", async () => {
  // Act & Assert
  await renderHistory(emptyPage);
  expect(screen.getByText("No versions on this page.")).toBeTruthy();
});

it("keeps a publication whose text is a byte order mark", async () => {
  // Act & Assert
  await renderHistory({ ...historyPage, items: [{ ...publication, markdown: "\uFEFF" }] });
  expect(screen.getByText(/published by user 9007199254740993/)).toBeTruthy();
});

it("keeps Previous available when the counted last page returns no versions", async () => {
  // Arrange
  await renderHistory({ ...emptyPage, page: 3, totalPages: 3, totalRecords: 25 }, 3);
  expect(screen.getByText("No versions on this page.")).toBeTruthy();
  expect(screen.getByText("Page 3 of 3")).toBeTruthy();
  expect(screen.getByText(/of 25 versions/)).toBeTruthy();

  // Act
  fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }));

  // Assert
  expect(replace).toHaveBeenCalledWith("/admin/legal?kind=terms&page=2", { scroll: false });
});

it.each([
  ["null body", null],
  ["failed envelope with paging fields", { ...emptyPage, success: false, message: "Internal diagnostic" }],
  ["missing items", {}],
  ["invalid page", { ...emptyPage, page: 0 }],
  ["missing count", { ...emptyPage, totalRecords: undefined }],
  ["inconsistent totals", { ...emptyPage, totalPages: 1 }],
  ["more publications than counted", { ...emptyPage, items: [publication] }],
  ["invalid row", { ...historyPage, items: [publication, null] }],
  ["blank text", { ...historyPage, items: [{ ...publication, markdown: " \u0085" }] }],
  ["null character", { ...historyPage, items: [{ ...publication, markdown: "bad\0text" }] }],
  ...Object.entries({
    id: "9223372036854775808", number: 0, change: "unknown", markdown: null,
    publishedAt: "not a date", publishedByUserId: 123,
  }).map(([field, value]): [string, unknown] => [
    `invalid ${field}`, { ...historyPage, items: [{ ...publication, [field]: value }] },
  ]),
])("shows a retryable error for %s", async (_label, data) => {
  // Act & Assert
  await renderHistory(data);
  expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
  expect(screen.queryByText("No versions on this page.")).toBeNull();
  expect(screen.queryByText(/published by user/)).toBeNull();
  expect(screen.queryByText(/Internal diagnostic/)).toBeNull();
});

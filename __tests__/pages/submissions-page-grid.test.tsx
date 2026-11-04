import { beforeEach, describe, expect, it, vi } from "vitest";
import { leafNames, resolveServerTree } from "@/test/resolve-server-tree";

const flag = vi.hoisted(() => ({ reportingExport: false }));
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT ${href}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: async () => flag.reportingExport,
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/features/forms/form-workspace", () => ({
  FormWorkspaceHeader: function FormWorkspaceHeader() {
    return null;
  },
}));
vi.mock("@/features/forms/form-workspace/load-workspace-form.server", () => ({
  getWorkspaceForm: vi.fn(),
}));
vi.mock("@/features/submissions/list-submissions", () => ({
  SubmissionListSection: function SubmissionListSection() {
    return null;
  },
}));
vi.mock("@/features/submissions/browse-submissions", () => ({
  SubmissionGridSection: function SubmissionGridSection() {
    return null;
  },
  SubmissionGridSkeleton: function SubmissionGridSkeleton() {
    return null;
  },
}));
vi.mock("@/components/table", () => ({
  PagedListFrame: function PagedListFrame() {
    return null;
  },
}));

import SubmissionsPage from "@/app/(main)/forms/[formId]/submissions/page";

const LEAVES = new Set([
  "FormWorkspaceHeader",
  "PagedListFrame",
  "SubmissionListSection",
  "SubmissionGridSection",
  "SubmissionGridSkeleton",
  "SubmissionsTableSkeleton",
]);

function renderPage(searchParams: Record<string, string> = {}) {
  return SubmissionsPage({
    params: Promise.resolve({ formId: "7" }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("Submissions page grid switch", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("renders only the legacy grid when reporting-export is off", async () => {
    // Arrange
    flag.reportingExport = false;

    // Act
    const leaves = leafNames(
      await resolveServerTree(await renderPage(), LEAVES),
    );

    // Assert
    expect(leaves).toContain("SubmissionListSection");
    expect(leaves).not.toContain("SubmissionGridSection");
  });

  it("keeps the legacy canonical redirect when reporting-export is off", async () => {
    // Arrange
    flag.reportingExport = false;

    // Act & Assert
    await expect(
      resolveServerTree(await renderPage({ isComplete: "true" }), LEAVES),
    ).rejects.toThrow(
      "REDIRECT /forms/7/submissions?collectionStatus=complete",
    );
  });

  it("renders the reporting grid with the legacy grid as its fallback when reporting-export is on", async () => {
    // Arrange
    flag.reportingExport = true;

    // Act
    const tree = await resolveServerTree(await renderPage(), LEAVES);

    // Assert
    const section = findLeaf(tree, "SubmissionGridSection");
    expect(section?.props).toMatchObject({ formId: "7", searchParams: {} });
    expect(leafNames(section?.props.unavailable as never)).toContain(
      "SubmissionListSection",
    );
  });
});

function findLeaf(
  tree: unknown,
  name: string,
): { props: Record<string, unknown> } | undefined {
  if (Array.isArray(tree)) {
    return tree.map((child) => findLeaf(child, name)).find(Boolean);
  }
  if (tree && typeof tree === "object" && "type" in tree && "props" in tree) {
    const node = tree as { type: string; props: Record<string, unknown> };
    return node.type === name ? node : undefined;
  }
  return undefined;
}

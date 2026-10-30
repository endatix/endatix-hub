import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree } from "@/test/resolve-server-tree";
import type { SubmissionGridColumnsLoad } from "../resolve-submission-grid-load";
import { SubmissionGridSection } from "../ui/submission-grid-section";

const loads = vi.hoisted(() => ({
  columns: vi.fn(),
  canIncludeInProgress: vi.fn(),
  config: vi.fn(),
  view: vi.fn(),
}));
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT ${href}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/features/auth", () => ({ getSession: async () => ({}) }));
vi.mock("@/features/config/server", () => ({
  getClientEndatixConfig: loads.config,
}));
vi.mock("../browse-submissions.server", () => ({
  loadSubmissionGridColumns: loads.columns,
  canEditSubmissionGrid: loads.canIncludeInProgress,
  loadSubmissionGridView: loads.view,
}));
vi.mock("@/components/error-handling/error-page", () => ({
  HubPageLoadError: function HubPageLoadError() {
    return null;
  },
}));
vi.mock("@/components/table", () => ({
  PagedListFrame: function PagedListFrame() {
    return null;
  },
}));
vi.mock("../ui/submission-grid-shell", () => ({
  SubmissionGridShell: function SubmissionGridShell() {
    return null;
  },
}));
vi.mock("../ui/submission-grid-rows-section", () => ({
  SubmissionGridRowsSection: function SubmissionGridRowsSection() {
    return null;
  },
}));

const LEAVES = new Set([
  "HubPageLoadError",
  "PagedListFrame",
  "SubmissionGridShell",
  "SubmissionGridRowsSection",
  "SubmissionGridSkeleton",
  "i",
]);

function answerColumn(key: string) {
  return {
    key,
    kind: "Simple",
    title: `Title of ${key}`,
    questionType: "text",
    filterType: "text" as const,
    placement: { pageName: null, pageTitle: null, panelTitle: null },
  };
}

const READY: SubmissionGridColumnsLoad = {
  kind: "ready",
  schemaReady: true,
  readiness: {
    submissions: 3,
    completedSubmissions: 3,
    prepared: 2,
    pending: 0,
    failed: 0,
    skippedInProgress: 0,
  },
  catalog: [answerColumn("q1"), answerColumn("q2")],
};

type Leaf = { type: string; props: Record<string, any> };

async function renderSection(searchParams: Record<string, string> = {}) {
  const element = await SubmissionGridSection({
    formId: "7",
    searchParams,
    unavailable: <i>legacy grid</i>,
  });
  return (await resolveServerTree(element, LEAVES)) as Leaf;
}

describe("SubmissionGridSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loads.canIncludeInProgress.mockResolvedValue(true);
    loads.config.mockResolvedValue({ submitterPrimaryFilterLabel: "Visitor" });
    loads.view.mockResolvedValue({
      version: null,
      settings: { v: 1, columns: [] },
    });
  });

  it("renders the given fallback when the API has no grid for the form", async () => {
    // Arrange
    loads.columns.mockResolvedValue({ kind: "unavailable" });

    // Act
    const tree = await renderSection();

    // Assert
    expect(tree).toEqual({ type: "i", props: { children: "legacy grid" } });
  });

  it("renders the load error when the columns fail", async () => {
    // Arrange
    const result = { message: "Unable to load submission columns." };
    loads.columns.mockResolvedValue({ kind: "error", result });

    // Act
    const tree = await renderSection();

    // Assert
    expect(tree).toEqual({ type: "HubPageLoadError", props: { result } });
  });

  it("redirects a non-canonical URL to its canonical form", async () => {
    // Arrange
    loads.columns.mockResolvedValue(READY);

    // Act & Assert
    await expect(renderSection({ status: "read,bogus" })).rejects.toThrow(
      "REDIRECT /forms/7/submissions?status=read",
    );
  });

  it("renders the banner and the rows for the visible answer columns", async () => {
    // Arrange
    loads.columns.mockResolvedValue(READY);

    // Act
    const shell = await renderSection({ page: "2", columns: "q2" });

    // Assert
    expect(shell.type).toBe("SubmissionGridShell");
    expect(shell.props).toMatchObject({
      formId: "7",
      hasSubmissions: true,
      banner: {
        lines: ["1 submission completed is not prepared."],
        showPrepare: true,
      },
    });
    const rows = (shell.props.children as Leaf).props.children as Leaf;
    expect(rows.type).toBe("SubmissionGridRowsSection");
    expect(rows.props).toMatchObject({
      formId: "7",
      submitterLabel: "Visitor",
      urlState: { page: 2, columns: ["q2"] },
      answerColumns: [{ key: "q2", title: "Title of q2" }],
    });
  });

  it("loads the rows for the saved view where the URL says nothing", async () => {
    // Arrange
    loads.columns.mockResolvedValue(READY);
    const view = {
      version: "4",
      settings: { v: 1, columns: [{ key: "q2" }], pageSize: 30 },
    };
    loads.view.mockResolvedValue(view);

    // Act
    const shell = await renderSection({ page: "2" });

    // Assert
    expect(shell.props).toMatchObject({ view, canSaveView: true });
    const rows = (shell.props.children as Leaf).props.children as Leaf;
    expect(rows.props).toMatchObject({
      urlState: { page: 2, pageSize: 30, columns: ["q2"] },
      answerColumns: [{ key: "q2" }],
    });
  });

  it("hands the shell every answer column for the picker", async () => {
    // Arrange
    loads.columns.mockResolvedValue(READY);

    // Act
    const shell = await renderSection({ columns: "q2" });

    // Assert
    const catalogKeys = (shell.props.catalog as { key: string }[]).map(
      (column) => column.key,
    );
    expect(catalogKeys).toEqual(["q1", "q2"]);
  });

  it("offers Include in-progress only to users who may edit the form", async () => {
    // Arrange
    loads.columns.mockResolvedValue({
      ...READY,
      readiness: { ...READY.readiness, submissions: 5 },
    });
    loads.canIncludeInProgress.mockResolvedValue(false);

    // Act
    const shell = await renderSection();

    // Assert
    expect(shell.props.banner).toMatchObject({ showIncludeInProgress: false });
  });

  it("starts the permission and config reads without waiting for the columns", async () => {
    // Arrange
    let answerColumns!: (load: SubmissionGridColumnsLoad) => void;
    loads.columns.mockReturnValue(
      new Promise((resolve) => {
        answerColumns = resolve;
      }),
    );

    // Act
    const rendering = renderSection();
    await vi.waitFor(() => expect(loads.columns).toHaveBeenCalled());

    // Assert
    expect(loads.canIncludeInProgress).toHaveBeenCalled();
    expect(loads.config).toHaveBeenCalled();
    answerColumns({ kind: "unavailable" });
    await rendering;
  });
});

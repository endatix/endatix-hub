import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree } from "@/test/resolve-server-tree";
import type { SubmissionGridColumnsLoad } from "../resolve-submission-grid-load";
import { SubmissionGridSection } from "../ui/submission-grid-section";

const loads = vi.hoisted(() => ({
  columns: vi.fn(),
  canIncludeInProgress: vi.fn(),
  config: vi.fn(),
  view: vi.fn(),
  testAccess: vi.fn(),
}));
const NO_TEST_ACCESS = { canMark: false, canDeleteTests: false };
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
  loadSubmissionTestAccess: loads.testAccess,
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
    search: { state: "ready" as const, source: null },
    placement: { pageName: null, pageTitle: null, panelTitle: null },
  };
}

const READY: SubmissionGridColumnsLoad = {
  kind: "ready",
  schemaReady: true,
  readiness: {
    submissions: 3,
    completedSubmissions: 3,
    inProgress: 0,
    prepared: 2,
    pending: 0,
    failed: 0,
    skippedInProgress: 0,
  },
  catalog: [answerColumn("q1"), answerColumn("q2")],
};

const ANSWER_FILTERS_WAITING_LINE =
  "Answer filters on columns that are not filterable or still being prepared are not applied.";

const SLOTS = { used: 52, max: 64, userUsed: 2, userMax: 14 };

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
    loads.canIncludeInProgress.mockResolvedValue(true);
    loads.testAccess.mockResolvedValue(NO_TEST_ACCESS);
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
      readiness: { ...READY.readiness, submissions: 5, inProgress: 2 },
    });
    loads.canIncludeInProgress.mockResolvedValue(false);

    // Act
    const shell = await renderSection();

    // Assert
    expect(shell.props.banner).toMatchObject({ showIncludeInProgress: false });
  });

  it.each([
    ["an editor", true, SLOTS, { canEdit: true, slots: SLOTS }],
    ["a viewer", false, SLOTS, { canEdit: false, slots: SLOTS }],
    ["an API without search keys", true, undefined, { canEdit: true }],
  ])(
    "hands the picker what %s may do about filterable columns",
    async (_, canEdit, searchSlots, expected) => {
      // Arrange
      loads.columns.mockResolvedValue({ ...READY, searchSlots });
      loads.canIncludeInProgress.mockResolvedValue(canEdit);

      // Act
      const shell = await renderSection();

      // Assert
      expect(shell.props.columnSearch).toEqual(expected);
    },
  );

  it("lets the coverage banner speak while answer filters are applied", async () => {
    // Arrange
    loads.columns.mockResolvedValue(READY);

    // Act
    const shell = await renderSection({ "answer.contains.q1": "acme" });

    // Assert
    expect(shell.props.banner).toBeNull();
  });

  it("keeps a link's answer filters without a schema, sends none, and says so", async () => {
    // Arrange
    loads.columns.mockResolvedValue({
      ...READY,
      schemaReady: false,
      catalog: [],
    });

    // Act
    const shell = await renderSection({ "answer.contains.q1": "acme" });

    // Assert
    expect(shell.props.banner.lines).toContain(
      "The answer filters in this link are not applied until the form is prepared.",
    );
    const rows = (shell.props.children as Leaf).props.children as Leaf;
    expect(rows.props.urlState.answerFilters).toEqual([]);
  });

  it("keeps a filter on a column still being prepared, sends none, and says so", async () => {
    // Arrange
    const preparing = {
      ...answerColumn("q2"),
      filterType: null,
      search: { state: "preparing" as const, source: "user" as const },
    };
    loads.columns.mockResolvedValue({
      ...READY,
      catalog: [answerColumn("q1"), preparing],
    });

    // Act
    const shell = await renderSection({ "answer.contains.q2": "acme" });

    // Assert
    expect(shell.props.banner.lines).toContain(ANSWER_FILTERS_WAITING_LINE);
    const rows = (shell.props.children as Leaf).props.children as Leaf;
    expect(rows.props.urlState.answerFilters).toEqual([]);
  });

  it("keeps a filter on a column an editor made not filterable, sends none, and says so", async () => {
    // Arrange
    const removed = {
      ...answerColumn("q2"),
      filterType: null,
      search: { state: "eligible" as const, source: null },
    };
    loads.columns.mockResolvedValue({
      ...READY,
      catalog: [answerColumn("q1"), removed],
    });

    // Act
    const shell = await renderSection({ "answer.contains.q2": "acme" });

    // Assert
    expect(shell.props.banner.lines).toContain(ANSWER_FILTERS_WAITING_LINE);
    const rows = (shell.props.children as Leaf).props.children as Leaf;
    expect(rows.props.urlState.answerFilters).toEqual([]);
  });

  it("drops a filter the form cannot apply through the canonical redirect", async () => {
    // Arrange
    loads.columns.mockResolvedValue(READY);

    // Act & Assert
    await expect(
      renderSection({
        "answer.from.q1": "2026-01-01",
        "answer.contains.q2": "acme",
        "answer.contains.gone": "x",
      }),
    ).rejects.toThrow("REDIRECT /forms/7/submissions?answer.contains.q2=acme");
  });

  it("gives up visible columns for the bytes the answer filters take", async () => {
    // Arrange
    const catalog = Array.from({ length: 500 }, (_, i) =>
      answerColumn(`question_${i}`),
    );
    loads.columns.mockResolvedValue({ ...READY, catalog });
    const columns = catalog.map((column) => column.key).join(",");
    const visibleCount = async (raw: Record<string, string>) => {
      const shell = await renderSection({ columns, ...raw });
      const rows = (shell.props.children as Leaf).props.children as Leaf;
      return (rows.props.answerColumns as unknown[]).length;
    };

    // Act
    const unfiltered = await visibleCount({});
    const filtered = await visibleCount({
      "answer.contains.question_0": "я".repeat(200),
    });

    // Assert
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(unfiltered);
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
    expect(loads.testAccess).toHaveBeenCalled();
    expect(loads.config).toHaveBeenCalled();
    answerColumns({ kind: "unavailable" });
    await rendering;
  });

  it("hands the shell the user's test access", async () => {
    // Arrange
    const testAccess = { canMark: true, canDeleteTests: false };
    loads.columns.mockResolvedValue(READY);
    loads.testAccess.mockResolvedValue(testAccess);

    // Act
    const shell = await renderSection();

    // Assert
    expect(shell.props.testAccess).toEqual(testAccess);
  });
});

import type { SubmissionViewSettings } from "@/lib/endatix-api/reporting/submission-view-types";
import { describe, expect, it } from "vitest";
import { SUBMISSION_GRID_METADATA_COLUMN_IDS } from "../submission-grid-columns";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import {
  applyViewDefaults,
  DEFAULT_SUBMISSION_VIEW_SETTINGS,
  layoutFromSettings,
  readViewSettings,
  settingsFromGrid,
  tableLayoutFromView,
  viewDefaults,
  widthsFromColumnSizing,
  type SubmissionGridLayout,
} from "../submission-grid-view";

const SAVED: SubmissionViewSettings = {
  v: 1,
  columns: [
    { key: "createdAt", visible: true, width: 140 },
    { key: "complete", visible: false },
    { key: "q2", visible: true, width: 300 },
    { key: "q1", visible: true },
    { key: "q3", visible: false },
  ],
  pageSize: 30,
  sort: { key: "createdAt", direction: "asc" },
};

const DEFAULT_LAYOUT: SubmissionGridLayout = {
  metadataOrder: [...SUBMISSION_GRID_METADATA_COLUMN_IDS],
  hiddenMetadata: [],
  widths: {},
};

describe("readViewSettings", () => {
  it("drops columns without a key and keeps unknown properties", () => {
    // Act
    const settings = readViewSettings({
      v: 1,
      columns: [{ key: "q1" }, { width: 20 }, "q2", null],
      density: "compact",
    });

    // Assert
    expect(settings).toEqual({
      v: 1,
      columns: [{ key: "q1" }],
      density: "compact",
    });
  });

  it("reads anything that is not an object as the default view", () => {
    expect(readViewSettings("nope")).toBe(DEFAULT_SUBMISSION_VIEW_SETTINGS);
  });
});

describe("viewDefaults", () => {
  it("takes the visible answer columns in order, page size and sort", () => {
    expect(viewDefaults(SAVED)).toEqual({
      columns: ["q2", "q1"],
      pageSize: 30,
      sort: { field: "createdAt", direction: "asc" },
    });
  });

  it("leaves out what the grid cannot show", () => {
    // Arrange
    const settings: SubmissionViewSettings = {
      v: 1,
      columns: [{ key: "createdAt" }],
      pageSize: 25,
      sort: { key: "answer:q1", direction: "desc" },
    };

    // Act & Assert
    expect(viewDefaults(settings)).toEqual({
      columns: undefined,
      pageSize: undefined,
      sort: undefined,
    });
  });
});

describe("applyViewDefaults", () => {
  const defaults = viewDefaults(SAVED);

  it("fills in the view where the URL says nothing", () => {
    // Arrange
    const raw = { status: "new" };

    // Act
    const state = applyViewDefaults(parseSubmissionGridUrl(raw), raw, defaults);

    // Assert
    expect(state).toMatchObject({
      status: ["new"],
      columns: ["q2", "q1"],
      pageSize: 30,
      sort: { field: "createdAt", direction: "asc" },
    });
  });

  it("lets the URL win, the default page size included", () => {
    // Arrange
    const raw = { columns: "q3", pageSize: "10", sort: "modifiedAt:desc" };

    // Act
    const state = applyViewDefaults(parseSubmissionGridUrl(raw), raw, defaults);

    // Assert
    expect(state).toMatchObject({
      columns: ["q3"],
      pageSize: 10,
      sort: { field: "modifiedAt", direction: "desc" },
    });
  });

  it("keeps the grid's defaults when nothing is saved", () => {
    // Arrange
    const raw = {};
    const parsed = parseSubmissionGridUrl(raw);

    // Act
    const state = applyViewDefaults(
      parsed,
      raw,
      viewDefaults(DEFAULT_SUBMISSION_VIEW_SETTINGS),
    );

    // Assert
    expect(state).toEqual(parsed);
  });
});

describe("layoutFromSettings", () => {
  it("reads metadata order, hidden metadata and widths", () => {
    // Act
    const layout = layoutFromSettings(SAVED);

    // Assert
    expect(layout.metadataOrder.slice(0, 3)).toEqual([
      "createdAt",
      "complete",
      "modifiedAt",
    ]);
    expect(layout.metadataOrder).toHaveLength(
      SUBMISSION_GRID_METADATA_COLUMN_IDS.length,
    );
    expect(layout.hiddenMetadata).toEqual(["complete"]);
    expect(layout.widths).toEqual({ createdAt: 140, q2: 300 });
  });
});

describe("tableLayoutFromView", () => {
  it("maps view keys to grid column ids", () => {
    // Act
    const table = tableLayoutFromView(layoutFromSettings(SAVED));

    // Assert
    expect(table.columnOrder.slice(0, 2)).toEqual(["actions", "createdAt"]);
    expect(table.columnVisibility).toEqual({ complete: false });
    expect(table.columnSizing).toEqual({ createdAt: 140, "answer:q2": 300 });
  });

  it("reads table sizes back as view widths", () => {
    // Act
    const widths = widthsFromColumnSizing({
      actions: 48,
      createdAt: 140.6,
      "answer:status": 9000,
    });

    // Assert
    expect(widths).toEqual({ createdAt: 141, status: 4000 });
  });
});

describe("settingsFromGrid", () => {
  it("saves metadata in order, then the visible answers", () => {
    // Arrange
    const layout: SubmissionGridLayout = {
      ...DEFAULT_LAYOUT,
      hiddenMetadata: ["status"],
      widths: { q1: 250 },
    };

    // Act
    const settings = settingsFromGrid(DEFAULT_SUBMISSION_VIEW_SETTINGS, {
      answerKeys: ["q1", "q2"],
      pageSize: 20,
      sort: undefined,
      layout,
    });

    // Assert
    expect(settings.columns.map((column) => column.key)).toEqual([
      ...SUBMISSION_GRID_METADATA_COLUMN_IDS,
      "q1",
      "q2",
    ]);
    expect(settings.columns).toContainEqual({ key: "status", visible: false });
    expect(settings.columns).toContainEqual({
      key: "q1",
      visible: true,
      width: 250,
    });
    expect(settings).toMatchObject({ v: 1, pageSize: 20, sort: null });
  });

  it("keeps properties it does not know and drops a cleared width", () => {
    // Arrange
    const base: SubmissionViewSettings = {
      v: 1,
      columns: [{ key: "q1", width: 300, pinned: "left" }],
      density: "compact",
    };

    // Act
    const settings = settingsFromGrid(base, {
      answerKeys: ["q1"],
      pageSize: 10,
      sort: { field: "createdAt", direction: "desc" },
      layout: DEFAULT_LAYOUT,
    });

    // Assert
    expect(settings.density).toBe("compact");
    expect(settings.columns.at(-1)).toEqual({
      key: "q1",
      visible: true,
      pinned: "left",
    });
    expect(settings.sort).toEqual({ key: "createdAt", direction: "desc" });
  });

  it("round-trips through the grid state", () => {
    // Arrange
    const layout = layoutFromSettings(SAVED);
    const defaults = viewDefaults(SAVED);

    // Act
    const saved = settingsFromGrid(SAVED, {
      answerKeys: defaults.columns ?? [],
      pageSize: defaults.pageSize ?? 10,
      sort: defaults.sort,
      layout,
    });

    // Assert
    expect(viewDefaults(saved)).toEqual(defaults);
    expect(layoutFromSettings(saved)).toEqual(layout);
  });
});

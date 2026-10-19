import { describe, expect, it } from "vitest";
import {
  fitsRowColumns,
  rowColumnsUsage,
} from "@/lib/endatix-api/reporting/submission-grid-row-columns";
import { MAX_SUBMISSION_GRID_ROW_COLUMNS } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  columnKeysOf,
  columnOrder,
  filterColumnGroups,
  groupColumnsByPlacement,
  groupLabel,
  groupSelection,
  hideColumns,
  limitRenderedColumns,
  showColumns,
  toggleColumn,
} from "../submission-grid-column-picker";
import {
  resolveVisibleAnswerColumns,
  type AnswerColumn,
  type AnswerColumnPlacement,
} from "../submission-grid-columns";
import { columnsUpdate } from "../submission-grid-url-updates";
import {
  parseSubmissionGridUrl,
  toSubmissionGridRowsRequest,
} from "../submission-grid-url";

function column(
  key: string,
  placement: Partial<AnswerColumnPlacement> = {},
  overrides: Partial<AnswerColumn> = {},
): AnswerColumn {
  return {
    key,
    kind: "Simple",
    title: `Title of ${key}`,
    questionType: "text",
    filterType: "text",
    placement: {
      pageName: "page1",
      pageTitle: "Page one",
      panelTitle: null,
      ...placement,
    },
    ...overrides,
  };
}

function keysOfGroups(catalog: AnswerColumn[]) {
  return groupColumnsByPlacement(catalog).map((group) => ({
    label: groupLabel(group),
    keys: columnKeysOf([group]),
  }));
}

describe("groupColumnsByPlacement", () => {
  it("groups by page and panel in schema order", () => {
    // Arrange
    const catalog = [
      column("q1"),
      column("q2", { panelTitle: "Contact" }),
      column("q3", { pageName: "page2", pageTitle: "Page two" }),
    ];

    // Act
    const groups = keysOfGroups(catalog);

    // Assert
    expect(groups).toEqual([
      { label: "Page one", keys: ["q1"] },
      { label: "Page one › Contact", keys: ["q2"] },
      { label: "Page two", keys: ["q3"] },
    ]);
  });

  it("keeps a page's loose questions together around a panel", () => {
    // Arrange
    const catalog = [
      column("q1"),
      column("q2", { panelTitle: "Contact" }),
      column("q3"),
    ];

    // Act
    const groups = keysOfGroups(catalog);

    // Assert
    expect(groups).toEqual([
      { label: "Page one", keys: ["q1", "q3"] },
      { label: "Page one › Contact", keys: ["q2"] },
    ]);
  });

  it("labels a page by its name without a title, and others as Other", () => {
    // Arrange
    const catalog = [
      column("q1", { pageTitle: null }),
      column("q2", { pageName: null, pageTitle: null }),
    ];

    // Act
    const groups = keysOfGroups(catalog);

    // Assert
    expect(groups.map((group) => group.label)).toEqual(["page1", "Other"]);
  });

  it("puts submitter fields in their own group", () => {
    // Arrange
    const catalog = [
      column("submitter_email", {}, { kind: "SubmitterProfile" }),
      column("q1"),
    ];

    // Act
    const groups = keysOfGroups(catalog);

    // Assert
    expect(groups[0]).toEqual({
      label: "Submitter",
      keys: ["submitter_email"],
    });
  });
});

describe("filterColumnGroups", () => {
  const groups = groupColumnsByPlacement([
    column("q1", {}, { title: "First Name" }),
    column("email", { panelTitle: "Contact" }, { title: "Mail" }),
    column("q3", { panelTitle: "Contact" }, { title: "Phone" }),
  ]);

  it("matches titles ignoring case", () => {
    // Act
    const matches = filterColumnGroups(groups, "  first NAME ");

    // Assert
    expect(columnKeysOf(matches)).toEqual(["q1"]);
  });

  it("matches keys and drops groups with no match", () => {
    // Act
    const matches = filterColumnGroups(groups, "EMAIL");

    // Assert
    expect(matches.map(groupLabel)).toEqual(["Page one › Contact"]);
    expect(columnKeysOf(matches)).toEqual(["email"]);
  });

  it("keeps every column for a blank query", () => {
    // Act
    const matches = filterColumnGroups(groups, "   ");

    // Assert
    expect(columnKeysOf(matches)).toEqual(["q1", "email", "q3"]);
  });

  it("narrows a 1,000-question form", () => {
    // Arrange
    const large = groupColumnsByPlacement(
      Array.from({ length: 1000 }, (_, index) => column(`question${index}`)),
    );

    // Act
    const matches = filterColumnGroups(large, "question99");

    // Assert
    expect(columnKeysOf(matches)).toEqual([
      "question99",
      "question990",
      "question991",
      "question992",
      "question993",
      "question994",
      "question995",
      "question996",
      "question997",
      "question998",
      "question999",
    ]);
  });
});

describe("limitRenderedColumns", () => {
  it("draws the first columns across groups and keeps whole groups for bulk actions", () => {
    // Arrange
    const groups = groupColumnsByPlacement([
      column("q1"),
      column("q2"),
      column("q3", { panelTitle: "Contact" }),
      column("q4", { panelTitle: "Contact" }),
      column("q5", { pageName: "page2" }),
    ]);

    // Act
    const rendered = limitRenderedColumns(groups, 3);

    // Assert
    expect(rendered.map((item) => item.columns.map((c) => c.key))).toEqual([
      ["q1", "q2"],
      ["q3"],
    ]);
    expect(columnKeysOf([rendered[1].group])).toEqual(["q3", "q4"]);
  });
});

describe("column selection", () => {
  const formOrder = columnOrder(
    ["q1", "q2", "q3", "q4", "q5"].map((key) => column(key)),
  );

  it("puts shown columns at their place in the form", () => {
    // Act
    const next = showColumns(["q1", "q3", "q5"], ["q4", "q2"], formOrder);

    // Assert
    expect(next).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("puts a hidden and shown again column back where it was", () => {
    // Act
    const next = toggleColumn(
      toggleColumn(["q1", "q2", "q3"], "q2", formOrder),
      "q2",
      formOrder,
    );

    // Assert
    expect(next).toEqual(["q1", "q2", "q3"]);
  });

  it("keeps a visible order that differs from the form", () => {
    // Act
    const next = showColumns(["q3", "q1"], ["q2"], formOrder);

    // Assert
    expect(next).toEqual(["q2", "q3", "q1"]);
  });

  it("never drops a visible column to fit a new one", () => {
    // Arrange
    const keys = Array.from({ length: 600 }, (_, index) => `q${index}`);
    const order = columnOrder(keys.map((key) => column(key)));
    const visible = keys.slice(100, 600);

    // Act
    const next = showColumns(visible, ["q0"], order);

    // Assert
    expect(next).toEqual(visible);
  });

  it("stops at the number of columns the rows endpoint accepts", () => {
    // Arrange
    const keys = Array.from({ length: 1000 }, (_, index) => `q${index}`);

    // Act
    const next = showColumns(
      [],
      keys,
      columnOrder(keys.map((key) => column(key))),
    );

    // Assert
    expect(next).toHaveLength(MAX_SUBMISSION_GRID_ROW_COLUMNS);
    expect(fitsRowColumns(rowColumnsUsage(next), "q")).toBe(false);
  });

  it("hides columns and toggles one", () => {
    // Act
    const hidden = hideColumns(["q1", "q2", "q3"], ["q2", "missing"]);
    const toggled = toggleColumn(
      toggleColumn(hidden, "q1", formOrder),
      "q4",
      formOrder,
    );

    // Assert
    expect(hidden).toEqual(["q1", "q3"]);
    expect(toggled).toEqual(["q3", "q4"]);
  });

  it("describes how much of a group is shown", () => {
    // Arrange
    const [group] = groupColumnsByPlacement([column("q1"), column("q2")]);

    // Act
    const states = [[], ["q1"], ["q1", "q2"]].map((keys) =>
      groupSelection(group, new Set(keys)),
    );

    // Assert
    expect(states).toEqual(["none", "some", "all"]);
  });
});

describe("picked columns reach the rows request", () => {
  it("requests only the columns the picker shows", () => {
    // Arrange
    const catalog = Array.from({ length: 1000 }, (_, index) =>
      column(`q${index}`),
    );
    const picked = showColumns([], ["q7", "q2", "q999"], columnOrder(catalog));

    // Act
    const { columns } = columnsUpdate(picked);
    const url = parseSubmissionGridUrl({ columns: columns ?? undefined });
    const visible = resolveVisibleAnswerColumns(catalog, url.columns);
    const request = toSubmissionGridRowsRequest(
      url,
      visible.map((c) => c.key),
    );

    // Assert
    expect(request.columns).toEqual(["q2", "q7", "q999"]);
  });

  it("goes back to the default view when nothing is picked", () => {
    // Act
    const update = columnsUpdate([]);

    // Assert
    expect(update).toEqual({ columns: null });
  });
});

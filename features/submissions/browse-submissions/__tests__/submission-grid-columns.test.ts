import { describe, expect, it } from "vitest";
import type {
  SubmissionGridColumn,
  SubmissionGridRow,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  answerColumnId,
  DEFAULT_VISIBLE_ANSWER_COLUMNS,
  formatAnswerValue,
  readAnswer,
  resolveVisibleAnswerColumns,
  SUBMISSION_GRID_METADATA_COLUMN_IDS,
  toAnswerColumns,
} from "../submission-grid-columns";

function wireColumn(
  key: string,
  overrides: Partial<SubmissionGridColumn> = {},
): SubmissionGridColumn {
  return {
    key,
    kind: "Simple",
    title: `Title of ${key}`,
    questionType: "text",
    filterType: "text",
    pageName: "page1",
    pageTitle: "Page one",
    panelTitle: null,
    ...overrides,
  };
}

function row(overrides: Partial<SubmissionGridRow> = {}): SubmissionGridRow {
  return {
    id: "9007199254740993",
    formId: "1",
    formDefinitionId: "2",
    isComplete: true,
    status: "new",
    createdAt: "2026-10-01T10:00:00Z",
    rowState: "prepared",
    answers: {},
    answersSource: "prepared",
    ...overrides,
  };
}

describe("toAnswerColumns", () => {
  it("keeps the title and the page and panel placement for the picker", () => {
    // Arrange
    const wire = wireColumn("q1", { panelTitle: "Contact" });

    // Act
    const [column] = toAnswerColumns([wire]);

    // Assert
    expect(column).toEqual({
      key: "q1",
      kind: "Simple",
      title: "Title of q1",
      questionType: "text",
      filterType: "text",
      placement: {
        pageName: "page1",
        pageTitle: "Page one",
        panelTitle: "Contact",
      },
    });
  });

  it("falls back to the key when the schema has no title", () => {
    const [column] = toAnswerColumns([wireColumn("q1", { title: "" })]);

    expect(column.title).toBe("q1");
  });
});

describe("resolveVisibleAnswerColumns", () => {
  it("shows the first question columns in schema order without a requested view", () => {
    // Arrange
    const catalog = toAnswerColumns([
      wireColumn("choice", { kind: "ChoiceIndicator" }),
      ...Array.from({ length: 12 }, (_, index) => wireColumn(`q${index}`)),
    ]);

    // Act
    const visible = resolveVisibleAnswerColumns(catalog, undefined);

    // Assert
    expect(visible).toHaveLength(DEFAULT_VISIBLE_ANSWER_COLUMNS);
    expect(visible[0].key).toBe("q0");
    expect(visible.map((column) => column.kind)).not.toContain(
      "ChoiceIndicator",
    );
  });

  it("follows the requested order and drops keys the schema no longer has", () => {
    // Arrange
    const catalog = toAnswerColumns([
      wireColumn("a"),
      wireColumn("b"),
      wireColumn("c"),
    ]);

    // Act
    const visible = resolveVisibleAnswerColumns(catalog, ["c", "gone", "a"]);

    // Assert
    expect(visible.map((column) => column.key)).toEqual(["c", "a"]);
  });

  it("stops at the number of columns the rows endpoint accepts", () => {
    // Arrange
    const keys = Array.from({ length: 501 }, (_, index) => `q${index}`);
    const catalog = toAnswerColumns(keys.map((key) => wireColumn(key)));

    // Act
    const visible = resolveVisibleAnswerColumns(catalog, keys);

    // Assert
    expect(visible).toHaveLength(500);
  });

  it("trims a typed or saved view to what fits the rows request line", () => {
    // Arrange
    const keys = Array.from(
      { length: 500 },
      (_, index) => `respondent_answer_${String(index).padStart(4, "0")}`,
    );
    const catalog = toAnswerColumns(keys.map((key) => wireColumn(key)));

    // Act
    const visible = resolveVisibleAnswerColumns(catalog, [...keys].reverse());

    // Assert
    // 22-byte keys plus a 3-byte `%2C` each: 245 keys take 6,122 of 6,144 bytes.
    expect(visible).toHaveLength(245);
    expect(visible[0].key).toBe("respondent_answer_0499");
    expect(visible[244].key).toBe("respondent_answer_0255");
  });
});

describe("readAnswer", () => {
  it("reads the answer for the column key", () => {
    // Arrange
    const [column] = toAnswerColumns([wireColumn("q1")]);

    // Act & Assert
    expect(readAnswer(row({ answers: { q1: "Yes" } }), column)).toBe("Yes");
  });

  it("falls back to the submitter profile for a submitter column", () => {
    // Arrange
    const [column] = toAnswerColumns([
      wireColumn("submitter_email", { kind: "SubmitterProfile" }),
    ]);
    const raw = row({
      answersSource: "raw",
      submitterProfile: { email: "a@b.c" },
    });

    // Act & Assert
    expect(readAnswer(raw, column)).toBe("a@b.c");
  });

  it("does not read the profile for a question column", () => {
    // Arrange
    const [column] = toAnswerColumns([wireColumn("submitter_email")]);
    const raw = row({ submitterProfile: { email: "a@b.c" } });

    // Act & Assert
    expect(readAnswer(raw, column)).toBeUndefined();
  });
});

describe("formatAnswerValue", () => {
  it.each([
    [undefined, null],
    [null, null],
    ["", null],
    ["text", "text"],
    [42, "42"],
    [false, "false"],
    [["a", 2, null], "a, 2"],
    [[], null],
    [{ row1: "col1" }, '{"row1":"col1"}'],
  ])("formats %j as %j", (value, expected) => {
    expect(formatAnswerValue(value)).toBe(expected);
  });
});

describe("column ids", () => {
  it("match the metadata keys a saved view keeps (SubmissionViewColumns.MetadataKeys)", () => {
    expect([...SUBMISSION_GRID_METADATA_COLUMN_IDS].sort()).toEqual(
      [
        "complete",
        "createdAt",
        "modifiedAt",
        "startedAt",
        "completedAt",
        "completionTime",
        "submitterDisplayId",
        "status",
      ].sort(),
    );
  });

  it("keep an answer column apart from a metadata column with the same key", () => {
    expect(answerColumnId("status")).not.toBe("status");
  });
});

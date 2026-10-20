import { describe, expect, it } from "vitest";
import type { SubmissionGridColumn } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  answerDateFilter,
  answerTextFilterUrlKeys,
  applicableAnswerFilters,
  matchesStoredChoiceValue,
  parseAnswerFilters,
} from "../submission-grid-answer-filters";
import { buildListSubmissionGridRowsEndpoint } from "@/lib/endatix-api/reporting/submission-grid";
import {
  resolveVisibleAnswerColumns,
  toAnswerColumns,
} from "../submission-grid-columns";

/** Kestrel's default `MaxRequestLineSize`; the headroom covers metadata filters. */
const KESTREL_MAX_REQUEST_LINE_BYTES = 8_192;

function wireColumn(
  overrides: Partial<SubmissionGridColumn> & { key: string },
): SubmissionGridColumn {
  return {
    kind: "Simple",
    title: overrides.key,
    questionType: "text",
    filterType: "text",
    pageName: null,
    pageTitle: null,
    panelTitle: null,
    ...overrides,
  };
}

const CATALOG = toAnswerColumns([
  wireColumn({ key: "name" }),
  wireColumn({ key: "born", questionType: "text", filterType: "date" }),
  wireColumn({ key: "seen", filterType: "datetime" }),
  wireColumn({ key: "likes", questionType: "checkbox", filterType: null }),
]);

describe("parseAnswerFilters", () => {
  it("reads operator, key and value from each answer key", () => {
    // Act
    const filters = parseAnswerFilters({
      "answer.contains.name": "Ann",
      "answer.from.born": "2026-01-01",
      page: "2",
    });

    // Assert
    expect(filters).toEqual([
      { operator: "contains", key: "name", value: "Ann" },
      { operator: "from", key: "born", value: "2026-01-01" },
    ]);
  });

  it("cuts a contains value to what the API accepts", () => {
    // Act
    const [filter] = parseAnswerFilters({
      "answer.contains.name": "x".repeat(250),
    });

    // Assert
    expect(filter.value).toHaveLength(200);
  });

  it.each([
    ["answer.from.born", "2026-02-31"],
    ["answer.to.born", "2026-13-01"],
    ["answer.from.born", "2026-1-1"],
    ["answer.contains.name", "   "],
    ["answer.contains.", "Ann"],
    ["answer.equals.name", "Ann"],
    ["answer.name", "Ann"],
  ])("drops %s=%j", (name, value) => {
    expect(parseAnswerFilters({ [name]: value })).toEqual([]);
  });

  it("reads the first of repeated values", () => {
    expect(
      parseAnswerFilters({ "answer.contains.name": ["Ann", "Bob"] }),
    ).toEqual([{ operator: "contains", key: "name", value: "Ann" }]);
  });
});

describe("applicableAnswerFilters", () => {
  it("keeps filters whose operator fits the column's filter type", () => {
    // Arrange
    const filters = parseAnswerFilters({
      "answer.contains.name": "Ann",
      "answer.from.born": "2026-01-01",
      "answer.to.seen": "2026-01-31",
      "answer.contains.born": "2026",
      "answer.from.name": "2026-01-01",
      "answer.contains.likes": "red",
      "answer.contains.gone": "x",
    });

    // Act
    const applicable = applicableAnswerFilters(filters, CATALOG);

    // Assert
    expect(applicable.map(({ operator, key }) => `${operator}:${key}`)).toEqual(
      ["contains:name", "from:born", "to:seen"],
    );
  });

  it("keeps at most ten filters", () => {
    // Arrange
    const catalog = toAnswerColumns(
      Array.from({ length: 12 }, (_, i) => wireColumn({ key: `q${i}` })),
    );
    const filters = catalog.map((column) => ({
      operator: "contains" as const,
      key: column.key,
      value: "x",
    }));

    // Act & Assert
    expect(applicableAnswerFilters(filters, catalog)).toHaveLength(10);
  });

  it("drops every filter when the form has no schema columns", () => {
    // Arrange
    const filters = parseAnswerFilters({ "answer.contains.name": "Ann" });

    // Act & Assert
    expect(applicableAnswerFilters(filters, [])).toEqual([]);
  });
});

describe("answer filters on the rows request line", () => {
  it("stays under the API's request line limit with the widest columns", () => {
    // Arrange
    const questions = Array.from({ length: 500 }, (_, i) =>
      wireColumn({ key: `question_${i}` }),
    );
    const texts = Array.from({ length: 10 }, (_, i) =>
      wireColumn({ key: `вопрос_${i}` }),
    );
    const catalog = toAnswerColumns([...questions, ...texts]);
    const filters = texts.map((column) => ({
      operator: "contains" as const,
      key: column.key,
      value: "я".repeat(200),
    }));

    // Act
    const answerFilters = applicableAnswerFilters(filters, catalog);
    const columns = resolveVisibleAnswerColumns(
      catalog,
      catalog.map((column) => column.key),
      answerFilters,
    ).map((column) => column.key);
    const endpoint = buildListSubmissionGridRowsEndpoint("9007199254740993", {
      columns,
      answerFilters,
    });

    // Assert
    expect(answerFilters.length).toBeGreaterThan(0);
    expect(`GET ${endpoint} HTTP/1.1`.length).toBeLessThanOrEqual(
      KESTREL_MAX_REQUEST_LINE_BYTES - 512,
    );
  });
});

describe("toAnswerColumns filter types", () => {
  it("offers no answer filter on a column the API marks not searchable", () => {
    // Act
    const [column] = toAnswerColumns([
      wireColumn({ key: "name", searchable: false }),
    ]);

    // Assert
    expect(column.filterType).toBeNull();
  });

  it("leaves submitter columns to the list's profile filters", () => {
    // Act
    const [column] = toAnswerColumns([
      wireColumn({ key: "submitter_email", kind: "SubmitterProfile" }),
    ]);

    // Assert
    expect(column.filterType).toBeNull();
  });
});

describe("answerTextFilterUrlKeys", () => {
  it("lists a contains key per text column", () => {
    expect(answerTextFilterUrlKeys(CATALOG)).toEqual(["answer.contains.name"]);
  });
});

describe("answerDateFilter", () => {
  it("reads both bounds of one column", () => {
    // Arrange
    const filters = parseAnswerFilters({
      "answer.from.born": "2026-01-01",
      "answer.to.seen": "2026-02-01",
    });

    // Act & Assert
    expect(answerDateFilter(filters, "born")).toEqual({
      from: "2026-01-01",
      to: undefined,
    });
  });
});

describe("matchesStoredChoiceValue", () => {
  it.each([
    ["dropdown", true],
    ["radiogroup", true],
    ["text", false],
  ])("is %s → %s", (questionType, expected) => {
    // Arrange
    const [column] = toAnswerColumns([wireColumn({ key: "q", questionType })]);

    // Act & Assert
    expect(matchesStoredChoiceValue(column)).toBe(expected);
  });
});

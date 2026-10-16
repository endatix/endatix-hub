import { describe, expect, it } from "vitest";
import {
  buildSubmissionGridPath,
  isCanonicalSubmissionGridUrl,
  parseSubmissionGridUrl,
  serializeSubmissionGridUrl,
  toSubmissionGridRowsRequest,
} from "../submission-grid-url";

describe("parseSubmissionGridUrl", () => {
  it("reads defaults from an empty query", () => {
    expect(parseSubmissionGridUrl({})).toMatchObject({
      page: 1,
      pageSize: 10,
      collectionStatus: [],
      status: [],
      isTestSubmission: [],
      sort: undefined,
      columns: undefined,
    });
  });

  it("keeps only known filter values", () => {
    // Act
    const state = parseSubmissionGridUrl({
      collectionStatus: "complete,nope",
      status: "new,bogus",
      isTestSubmission: "true,maybe",
    });

    // Assert
    expect(state).toMatchObject({
      collectionStatus: ["complete"],
      status: ["new"],
      isTestSubmission: ["true"],
    });
  });

  it("reads the first sortable segment of the sort", () => {
    // Act
    const state = parseSubmissionGridUrl({
      sort: "complete:asc,createdAt:desc",
    });

    // Assert
    expect(state.sort).toEqual({ field: "createdAt", direction: "desc" });
  });

  it("rounds a hand-typed page size up to an offered size", () => {
    expect(parseSubmissionGridUrl({ pageSize: "15" }).pageSize).toBe(20);
  });

  it("maps the old isComplete flag onto collection status", () => {
    expect(
      parseSubmissionGridUrl({ isComplete: "true" }).collectionStatus,
    ).toEqual(["complete"]);
  });

  it("reads visible columns in order without duplicates", () => {
    expect(parseSubmissionGridUrl({ columns: "q2, q1,q2," }).columns).toEqual([
      "q2",
      "q1",
    ]);
  });
});

describe("serializeSubmissionGridUrl", () => {
  it("round-trips a full state and omits defaults", () => {
    // Arrange
    const raw = {
      page: "3",
      collectionStatus: "complete",
      createdFrom: "2026-01-01",
      submitterEmail: "a@b.c",
      sort: "modifiedAt:asc",
      columns: "q1,q2",
    };

    // Act
    const query = serializeSubmissionGridUrl(parseSubmissionGridUrl(raw));

    // Assert
    expect(Object.fromEntries(query)).toEqual(raw);
  });

  it("round-trips answer filters whose keys hold separators", () => {
    // Arrange
    const raw = {
      "answer.contains.panel:name.first": "Ann",
      "answer.from.born~date": "2026-01-01",
      "answer.to.born~date": "2026-01-31",
    };

    // Act
    const state = parseSubmissionGridUrl(raw);
    const query = serializeSubmissionGridUrl(state);

    // Assert
    expect(state.answerFilters).toEqual([
      { operator: "contains", key: "panel:name.first", value: "Ann" },
      { operator: "from", key: "born~date", value: "2026-01-01" },
      { operator: "to", key: "born~date", value: "2026-01-31" },
    ]);
    expect(Object.fromEntries(query)).toEqual(raw);
  });

  it("survives a reload through the encoded query string", () => {
    // Arrange
    const state = parseSubmissionGridUrl({
      "answer.contains.a&b=c": "x & y",
    });

    // Act
    const reloaded = parseSubmissionGridUrl(
      Object.fromEntries(
        new URLSearchParams(serializeSubmissionGridUrl(state).toString()),
      ),
    );

    // Assert
    expect(reloaded.answerFilters).toEqual(state.answerFilters);
  });
});

describe("isCanonicalSubmissionGridUrl", () => {
  it("accepts the query its own state serializes to", () => {
    // Arrange
    const raw = { page: "2", status: "read", columns: "q1" };

    // Act & Assert
    expect(isCanonicalSubmissionGridUrl(raw, parseSubmissionGridUrl(raw))).toBe(
      true,
    );
  });

  it("accepts an explicit first page and default page size", () => {
    // Arrange
    const raw = { page: "1", pageSize: "10" };

    // Act & Assert
    expect(isCanonicalSubmissionGridUrl(raw, parseSubmissionGridUrl(raw))).toBe(
      true,
    );
  });

  it.each([
    [{ submitterDisplayId: " abc " }],
    [{ isComplete: "true" }],
    [{ status: "read,bogus" }],
    [{ sort: "createdAt:sideways" }],
  ])("rewrites %j", (raw) => {
    expect(isCanonicalSubmissionGridUrl(raw, parseSubmissionGridUrl(raw))).toBe(
      false,
    );
  });

  it("accepts answer filters its own state serializes to", () => {
    // Arrange
    const raw = { "answer.contains.q1": "acme", "answer.to.d1": "2026-01-31" };

    // Act & Assert
    expect(isCanonicalSubmissionGridUrl(raw, parseSubmissionGridUrl(raw))).toBe(
      true,
    );
  });

  it.each([
    [{ "answer.from.d1": "31/01/2026" }],
    [{ "answer.between.q1": "x" }],
    [{ "answer.contains.q1": " acme " }],
  ])("rewrites the answer filter in %j", (raw) => {
    expect(isCanonicalSubmissionGridUrl(raw, parseSubmissionGridUrl(raw))).toBe(
      false,
    );
  });

  it("ignores keys the grid does not own", () => {
    // Arrange
    const raw = { utm_source: "mail" };

    // Act & Assert
    expect(isCanonicalSubmissionGridUrl(raw, parseSubmissionGridUrl(raw))).toBe(
      true,
    );
  });
});

describe("buildSubmissionGridPath", () => {
  it("builds the bare path for the default state", () => {
    expect(buildSubmissionGridPath("7", parseSubmissionGridUrl({}))).toBe(
      "/forms/7/submissions",
    );
  });
});

describe("toSubmissionGridRowsRequest", () => {
  it("maps URL state and visible columns onto the list request", () => {
    // Arrange
    const state = parseSubmissionGridUrl({
      page: "2",
      sort: "completedAt:asc",
      startedTo: "2026-02-01",
      submitterEmail: "a@b.c",
    });

    // Act
    const request = toSubmissionGridRowsRequest(state, ["q1"]);

    // Assert
    expect(request).toMatchObject({
      page: 2,
      pageSize: 10,
      sortBy: "completedAt",
      sortDir: "asc",
      startedTo: "2026-02-01",
      submitterProfileFilter: { field: "email", value: "a@b.c" },
      columns: ["q1"],
    });
  });

  it("passes the answer filters on", () => {
    // Arrange
    const state = parseSubmissionGridUrl({ "answer.contains.q1": "acme" });

    // Act
    const request = toSubmissionGridRowsRequest(state, []);

    // Assert
    expect(request.answerFilters).toEqual([
      { operator: "contains", key: "q1", value: "acme" },
    ]);
  });
});

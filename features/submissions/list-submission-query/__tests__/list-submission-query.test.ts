import { describe, expect, it } from "vitest";
import {
  buildSubmissionListPath,
  isCanonicalSubmissionListUrl,
  parseSubmissionListSearchParams,
  serializeSubmissionListSearchParams,
  submissionListUrlStateFromClientFilters,
  submissionListUrlStateToListRequest,
} from "../index";

describe("parseSubmissionListSearchParams + serializeSubmissionListSearchParams", () => {
  it("round-trips filters and paging", () => {
    const raw = {
      page: "2",
      pageSize: "20",
      isComplete: "true,false",
      status: "new,approved",
      isTestSubmission: "true",
      createdFrom: "2024-03-01",
      createdTo: "2024-03-31",
      modifiedFrom: "2024-03-10",
      modifiedTo: "2024-03-25",
      startedFrom: "2024-03-15",
      startedTo: "2024-03-20",
      completedFrom: "2024-04-01",
      completedTo: "2024-04-30",
    };

    const parsed = parseSubmissionListSearchParams(raw);
    const serialized = serializeSubmissionListSearchParams(parsed).toString();
    const again = parseSubmissionListSearchParams(
      Object.fromEntries(new URLSearchParams(serialized)),
    );

    expect(again).toEqual(parsed);
    expect(submissionListUrlStateToListRequest(parsed)).toMatchObject({
      page: 2,
      pageSize: 20,
      isComplete: ["true", "false"],
      status: ["new", "approved"],
      isTestSubmission: ["true"],
      createdFrom: "2024-03-01",
      createdTo: "2024-03-31",
      modifiedFrom: "2024-03-10",
      modifiedTo: "2024-03-25",
      startedFrom: "2024-03-15",
      startedTo: "2024-03-20",
      completedFrom: "2024-04-01",
      completedTo: "2024-04-30",
    });
  });

  it("drops invalid calendar dates", () => {
    const parsed = parseSubmissionListSearchParams({
      createdFrom: "not-a-date",
      createdTo: "2024-13-40",
      modifiedFrom: "abc",
      modifiedTo: "2024-02-30",
    });
    expect(parsed.createdFrom).toBeUndefined();
    expect(parsed.createdTo).toBeUndefined();
    expect(parsed.modifiedFrom).toBeUndefined();
    expect(parsed.modifiedTo).toBeUndefined();
  });

  it("serializes modifiedAt bounds with the modifiedAt URL keys", () => {
    const parsed = parseSubmissionListSearchParams({
      modifiedFrom: "2024-05-01",
      modifiedTo: "2024-05-31",
    });

    expect(serializeSubmissionListSearchParams(parsed).toString()).toBe(
      "modifiedFrom=2024-05-01&modifiedTo=2024-05-31",
    );
    expect(submissionListUrlStateToListRequest(parsed)).toMatchObject({
      modifiedFrom: "2024-05-01",
      modifiedTo: "2024-05-31",
    });
  });

  it("uses defaults for page and pageSize when missing or invalid", () => {
    const parsed = parseSubmissionListSearchParams({
      page: "0",
      pageSize: "999",
    });
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(50);
  });

  it("parses submitterDisplayId as the submitter display id filter", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterDisplayId: "submitter-123",
    });

    expect(parsed.submitterDisplayId).toBe("submitter-123");
    expect(submissionListUrlStateToListRequest(parsed)).toMatchObject({
      submitterDisplayId: "submitter-123",
    });
  });

  it("serializes submitter display id filters with the submitterDisplayId URL key", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterDisplayId: "submitter-123",
    });

    expect(serializeSubmissionListSearchParams(parsed).toString()).toBe(
      "submitterDisplayId=submitter-123",
    );
  });

  it("maps submitterEmail URL state to the submitter profile email API filter", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterEmail: "external@endatix.com",
    });

    expect(parsed.submitterEmail).toBe("external@endatix.com");
    expect(submissionListUrlStateToListRequest(parsed)).toMatchObject({
      submitterProfileFilter: {
        field: "email",
        value: "external@endatix.com",
      },
    });
  });

  it("serializes submitter email filters with the submitterEmail URL key", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterEmail: "external@endatix.com",
    });

    expect(serializeSubmissionListSearchParams(parsed).toString()).toBe(
      "submitterEmail=external%40endatix.com",
    );
  });

  it("defaults sorting to an empty array when sort is absent", () => {
    expect(parseSubmissionListSearchParams({}).sorting).toEqual([]);
  });
});

describe("submission list sorting URL state", () => {
  it("round-trips sorting via the sort query param", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "createdAt:desc,status:asc",
    });

    expect(parsed.sorting).toEqual([
      { id: "createdAt", desc: true },
      { id: "status", desc: false },
    ]);
    expect(serializeSubmissionListSearchParams(parsed).toString()).toBe(
      "sort=createdAt%3Adesc%2Cstatus%3Aasc",
    );
  });

  it("parses underscore and hyphen column ids used by the grid", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "submitterDisplayId:asc,data_email:desc,submitterProfile_name:asc",
    });

    expect(parsed.sorting).toEqual([
      { id: "submitterDisplayId", desc: false },
      { id: "data_email", desc: true },
      { id: "submitterProfile_name", desc: false },
    ]);
  });

  it("trims whitespace around sort segments", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: " createdAt:desc , status:asc ",
    });

    expect(parsed.sorting).toEqual([
      { id: "createdAt", desc: true },
      { id: "status", desc: false },
    ]);
  });

  it("drops invalid sort segments", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "createdAt:desc,<script>:asc,bad,status:sideways, :asc,:desc",
    });

    expect(parsed.sorting).toEqual([{ id: "createdAt", desc: true }]);
  });

  it("omits sort from serialized query when sorting is empty", () => {
    const serialized = serializeSubmissionListSearchParams(
      parseSubmissionListSearchParams({ page: "2" }),
    ).toString();

    expect(serialized).toBe("page=2");
    expect(serialized).not.toContain("sort=");
  });

  it("maps primary URL sort to list API sortBy and sortDir", () => {
    const parsed = parseSubmissionListSearchParams({
      page: "2",
      sort: "createdAt:desc",
    });

    expect(submissionListUrlStateToListRequest(parsed)).toMatchObject({
      sortBy: "createdAt",
      sortDir: "desc",
    });
    expect(submissionListUrlStateToListRequest(parsed)).not.toHaveProperty(
      "sorting",
    );
    expect(submissionListUrlStateToListRequest(parsed)).not.toHaveProperty(
      "sort",
    );
  });

  it("preserves sorting alongside filters when round-tripping", () => {
    const raw = {
      page: "3",
      status: "new",
      sort: "completedAt:asc",
    };
    const parsed = parseSubmissionListSearchParams(raw);
    const again = parseSubmissionListSearchParams(
      Object.fromEntries(
        new URLSearchParams(serializeSubmissionListSearchParams(parsed)),
      ),
    );

    expect(again).toEqual(parsed);
    expect(again.sorting).toEqual([{ id: "completedAt", desc: false }]);
  });
});

describe("buildSubmissionListPath", () => {
  it("returns path without query when state is defaults and no filters", () => {
    const state = parseSubmissionListSearchParams({});
    expect(buildSubmissionListPath("form-1", state)).toBe(
      "/forms/form-1/submissions",
    );
  });

  it("appends serialized search when non-default", () => {
    const state = parseSubmissionListSearchParams({ page: "2" });
    expect(buildSubmissionListPath("form-1", state)).toBe(
      "/forms/form-1/submissions?page=2",
    );
  });

  it("includes sort in the path when sorting is set", () => {
    const state = parseSubmissionListSearchParams({
      sort: "createdAt:desc",
    });
    expect(buildSubmissionListPath("form-1", state)).toBe(
      "/forms/form-1/submissions?sort=createdAt%3Adesc",
    );
  });
});

describe("isCanonicalSubmissionListUrl", () => {
  const emptyDateBundle = {
    rawCreatedFrom: undefined as string | undefined,
    rawCreatedTo: undefined as string | undefined,
    rawModifiedFrom: undefined as string | undefined,
    rawModifiedTo: undefined as string | undefined,
    rawStartedFrom: undefined as string | undefined,
    rawStartedTo: undefined as string | undefined,
    rawCompletedFrom: undefined as string | undefined,
    rawCompletedTo: undefined as string | undefined,
    createdFrom: undefined as string | undefined,
    createdTo: undefined as string | undefined,
    modifiedFrom: undefined as string | undefined,
    modifiedTo: undefined as string | undefined,
    startedFrom: undefined as string | undefined,
    startedTo: undefined as string | undefined,
    completedFrom: undefined as string | undefined,
    completedTo: undefined as string | undefined,
  };

  it("is true when raw omits default paging and dates match parsed", () => {
    const parsed = parseSubmissionListSearchParams({});
    expect(
      isCanonicalSubmissionListUrl(
        undefined,
        undefined,
        parsed,
        emptyDateBundle,
      ),
    ).toBe(true);
  });

  it("is false when page 1 is explicit in URL (canonical omits default page)", () => {
    const parsed = parseSubmissionListSearchParams({ page: "1" });
    expect(
      isCanonicalSubmissionListUrl("1", undefined, parsed, emptyDateBundle),
    ).toBe(false);
  });

  it("is false when raw calendar date is invalid but parsed drops it", () => {
    const parsed = parseSubmissionListSearchParams({
      createdFrom: "2024-13-40",
    });
    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawCreatedFrom: "2024-13-40",
      }),
    ).toBe(false);
  });

  it("is false when raw modifiedAt is invalid but parsed drops it", () => {
    const parsed = parseSubmissionListSearchParams({
      modifiedFrom: "not-a-date",
    });
    expect(parsed.modifiedFrom).toBeUndefined();
    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawModifiedFrom: "not-a-date",
      }),
    ).toBe(false);
  });

  it("is true when raw modifiedAt bounds match parsed values", () => {
    const parsed = parseSubmissionListSearchParams({
      modifiedFrom: "2024-07-01",
      modifiedTo: "2024-07-31",
    });

    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawModifiedFrom: "2024-07-01",
        rawModifiedTo: "2024-07-31",
        modifiedFrom: "2024-07-01",
        modifiedTo: "2024-07-31",
      }),
    ).toBe(true);
  });

  it("accepts submitterDisplayId as canonical submitter display id input", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterDisplayId: "submitter-123",
    });

    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawSubmitterDisplayId: "submitter-123",
        submitterDisplayId: "submitter-123",
      }),
    ).toBe(true);
  });

  it("is false when raw submitterDisplayId does not match parsed submitter display id", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterDisplayId: "submitter-123",
    });

    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawSubmitterDisplayId: "different-submitter",
        submitterDisplayId: "submitter-123",
      }),
    ).toBe(false);
  });

  it("is true when raw submitterEmail matches parsed submitter email", () => {
    const parsed = parseSubmissionListSearchParams({
      submitterEmail: "external@endatix.com",
    });

    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawSubmitterEmail: "external@endatix.com",
        submitterEmail: "external@endatix.com",
      }),
    ).toBe(true);
  });

  it("is true when raw sort matches parsed sorting", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "createdAt:desc",
    });

    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawSort: "createdAt:desc",
      }),
    ).toBe(true);
  });

  it("is false when raw sort is invalid and parsed drops it", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "createdAt:nope",
    });

    expect(parsed.sorting).toEqual([]);
    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawSort: "createdAt:nope",
      }),
    ).toBe(false);
  });

  it("is false when raw omits sort but parsed has sorting", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "createdAt:desc",
    });

    expect(
      isCanonicalSubmissionListUrl(
        undefined,
        undefined,
        parsed,
        emptyDateBundle,
      ),
    ).toBe(false);
  });
});

describe("submissionListUrlStateFromClientFilters", () => {
  it("whitelists filter sets and validates calendar dates like parse", () => {
    const state = submissionListUrlStateFromClientFilters({
      page: 1,
      pageSize: 10,
      isComplete: new Set(["true", "bogus"]),
      status: new Set(["new", "hacker"]),
      isTestSubmission: new Set(["false"]),
      createdFrom: "2024-06-01",
      createdTo: "not-a-date",
      modifiedFrom: "2024-06-15",
      modifiedTo: "bogus",
      submitterEmail: " external@endatix.com ",
    });

    expect(state.isComplete).toEqual(["true"]);
    expect(state.status).toEqual(["new"]);
    expect(state.isTestSubmission).toEqual(["false"]);
    expect(state.createdFrom).toBe("2024-06-01");
    expect(state.createdTo).toBeUndefined();
    expect(state.modifiedFrom).toBe("2024-06-15");
    expect(state.modifiedTo).toBeUndefined();
    expect(state.submitterEmail).toBe("external@endatix.com");
    expect(state.sorting).toEqual([]);
  });

  it("sanitizes client sorting the same way as URL parse", () => {
    const state = submissionListUrlStateFromClientFilters({
      page: 1,
      pageSize: 10,
      isComplete: new Set(),
      status: new Set(),
      isTestSubmission: new Set(),
      sorting: [
        { id: "createdAt", desc: true },
        { id: "<script>", desc: false },
        { id: "status", desc: false },
      ],
    });

    expect(state.sorting).toEqual([
      { id: "createdAt", desc: true },
      { id: "status", desc: false },
    ]);
  });
});

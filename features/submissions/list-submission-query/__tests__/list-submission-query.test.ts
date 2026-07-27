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
      createdAtFrom: "2024-03-01",
      createdAtTo: "2024-03-31",
      startedAtFrom: "2024-03-15",
      startedAtTo: "2024-03-20",
      completedAtFrom: "2024-04-01",
      completedAtTo: "2024-04-30",
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
      createdAtFrom: "2024-03-01",
      createdAtTo: "2024-03-31",
      startedAtFrom: "2024-03-15",
      startedAtTo: "2024-03-20",
      completedAtFrom: "2024-04-01",
      completedAtTo: "2024-04-30",
    });
  });

  it("drops invalid calendar dates", () => {
    const parsed = parseSubmissionListSearchParams({
      createdAtFrom: "not-a-date",
      createdAtTo: "2024-13-40",
    });
    expect(parsed.createdAtFrom).toBeUndefined();
    expect(parsed.createdAtTo).toBeUndefined();
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

  it("drops invalid sort segments", () => {
    const parsed = parseSubmissionListSearchParams({
      sort: "createdAt:desc,<script>:asc,bad,status:sideways",
    });

    expect(parsed.sorting).toEqual([{ id: "createdAt", desc: true }]);
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
});

describe("isCanonicalSubmissionListUrl", () => {
  const emptyDateBundle = {
    rawCreatedAtFrom: undefined as string | undefined,
    rawCreatedAtTo: undefined as string | undefined,
    rawStartedAtFrom: undefined as string | undefined,
    rawStartedAtTo: undefined as string | undefined,
    rawCompletedAtFrom: undefined as string | undefined,
    rawCompletedAtTo: undefined as string | undefined,
    createdAtFrom: undefined as string | undefined,
    createdAtTo: undefined as string | undefined,
    startedAtFrom: undefined as string | undefined,
    startedAtTo: undefined as string | undefined,
    completedAtFrom: undefined as string | undefined,
    completedAtTo: undefined as string | undefined,
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
      createdAtFrom: "2024-13-40",
    });
    expect(
      isCanonicalSubmissionListUrl(undefined, undefined, parsed, {
        ...emptyDateBundle,
        rawCreatedAtFrom: "2024-13-40",
      }),
    ).toBe(false);
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
});

describe("submissionListUrlStateFromClientFilters", () => {
  it("whitelists filter sets and validates calendar dates like parse", () => {
    const state = submissionListUrlStateFromClientFilters({
      page: 1,
      pageSize: 10,
      isComplete: new Set(["true", "bogus"]),
      status: new Set(["new", "hacker"]),
      isTestSubmission: new Set(["false"]),
      createdAtFrom: "2024-06-01",
      createdAtTo: "not-a-date",
      submitterEmail: " external@endatix.com ",
    });

    expect(state.isComplete).toEqual(["true"]);
    expect(state.status).toEqual(["new"]);
    expect(state.isTestSubmission).toEqual(["false"]);
    expect(state.createdAtFrom).toBe("2024-06-01");
    expect(state.createdAtTo).toBeUndefined();
    expect(state.submitterEmail).toBe("external@endatix.com");
  });
});

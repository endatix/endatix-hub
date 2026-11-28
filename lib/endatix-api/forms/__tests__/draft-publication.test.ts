import { beforeEach, expect, it, vi } from "vitest";
import { EndatixApi } from "../../endatix-api";
import { ApiErrorType, isPreconditionFailed } from "../../shared/api-result";

const baseUrl = "https://example.test/api";
const { forms } = new EndatixApi("session", { baseUrl });
const fetchMock = vi.fn<typeof fetch>();
const formId = "9007199254740993";
const draft = {
  version: "9007199254740995",
  jsonData: '{"title":"Draft"}',
  contentHash: "a".repeat(64),
  activeNumber: 5,
  hasUnpublishedChanges: true,
  lastModifiedBy: { kind: "user", userId: null },
  recordsSinceSnapshot: 199,
};

const batch = {
  saveNo: 8,
  clientSessionId: "editor",
  records: [
    { seq: 1, value: "first" },
    { seq: 1, value: "second" },
  ],
  jsonData: draft.jsonData,
  contentHash: draft.contentHash,
};

const queued = {
  id: "9001",
  formId: "42",
  draftVersion: "18",
  status: "queued",
  requestedAt: "2026-11-28T10:00:00Z",
  committedAt: null,
  completedAt: null,
  definitionId: null,
  definitionNumber: null,
  outcome: null,
  findings: null,
  failureReason: null,
};
const publish = {
  partials: { policy: "keep_all" },
  acknowledgedFindings: ["name:page"],
  note: "Approved",
} as const;

beforeEach(() => vi.stubGlobal("fetch", fetchMock));

function reply(body: unknown, status = 200, headers?: HeadersInit) {
  fetchMock.mockResolvedValueOnce(Response.json(body, { status, headers }));
}

function expectRequest(path: string, method: string, version?: string) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${baseUrl}/forms/${path}`);
  expect(init?.method).toBe(method);
  expect(new Headers(init?.headers).get("If-Match")).toBe(
    version === undefined ? null : `"${version}"`,
  );
  return init?.body;
}

it("reads the draft with its version and journal cursor", async () => {
  // Arrange
  reply(draft);
  // Act
  const result = await forms.drafts.get(formId);
  // Assert
  expect(result).toEqual({ success: true, data: draft });
  expect(expectRequest(`${formId}/draft`, "GET")).toBeUndefined();
});

it.each([undefined, [{ afterRecord: 1, jsonData: '{"title":"first"}' }]])(
  "appends ordered records and their supplied checkpoints in one conditional write: %j",
  async (checkpoints) => {
    // Arrange
    const request = checkpoints ? { ...batch, checkpoints } : batch;
    const ack = {
      version: "9007199254740998",
      contentHash: draft.contentHash,
      saveNo: 8,
      recordsSinceSnapshot: 1,
    };
    reply(ack);
    // Act
    const result = await forms.drafts.append(formId, draft.version, request);
    // Assert
    expect(result).toEqual({ success: true, data: ack });
    expect(expectRequest(`${formId}/draft`, "PATCH", draft.version)).toBe(
      JSON.stringify(request),
    );
  },
);

it("replaces an unsaved draft using version zero", async () => {
  // Arrange
  reply(draft);
  // Act
  const result = await forms.drafts.replace(formId, "0", draft.jsonData);
  // Assert
  expect(result).toEqual({ success: true, data: draft });
  expect(expectRequest(`${formId}/draft`, "PUT", "0")).toBe(
    JSON.stringify({ jsonData: draft.jsonData }),
  );
});

it("discards the version read and returns the restored draft", async () => {
  // Arrange
  const restored = {
    ...draft,
    hasUnpublishedChanges: false,
    recordsSinceSnapshot: 0,
  };
  reply(restored);
  // Act
  const result = await forms.drafts.discard(formId, draft.version);
  // Assert
  expect(result).toEqual({ success: true, data: restored });
  expect(
    expectRequest(`${formId}/draft`, "DELETE", draft.version),
  ).toBeUndefined();
});

it("starts publication of the reviewed draft and returns the operation to poll", async () => {
  // Arrange
  reply(queued, 202);
  // Act
  const result = await forms.publications.start("42", "18", publish);
  // Assert
  expect(result).toEqual({ success: true, data: queued });
  expect(expectRequest("42/publications", "POST", "18")).toBe(
    JSON.stringify(publish),
  );
});

it("reads a completed publication by its form and operation IDs", async () => {
  // Arrange
  const completed = {
    ...queued,
    status: "completed",
    committedAt: "2026-11-28T10:00:01Z",
    completedAt: "2026-11-28T10:00:02Z",
    definitionId: "7812",
    definitionNumber: 5,
    outcome: "published",
  };
  reply(completed);
  // Act
  const result = await forms.publications.get("42", "9001");
  // Assert
  expect(result).toEqual({ success: true, data: completed });
  expect(expectRequest("42/publications/9001", "GET")).toBeUndefined();
});

it("returns the existing operation ID when another publication is unfinished", async () => {
  // Arrange
  reply(
    {
      status: 409,
      errorCode: "publication_in_progress",
      publicationId: formId,
    },
    409,
  );
  // Act
  const result = await forms.publications.start("42", "18", publish);
  // Assert
  expect(result).toMatchObject({
    success: false,
    error: {
      type: ApiErrorType.ConflictError,
      errorCode: "publication_in_progress",
      details: { existingId: formId },
    },
  });
});

it("preserves the winning draft, version and strong ETag on a stale save", async () => {
  // Arrange
  reply({ status: 412, version: draft.version, draft }, 412, {
    ETag: `"${draft.version}"`,
  });
  // Act
  const result = await forms.drafts.append(formId, "17", batch);
  // Assert
  expect(isPreconditionFailed(result)).toBe(true);
  expect(result).toMatchObject({
    success: false,
    error: {
      type: "PreconditionFailed",
      details: { version: draft.version, draft, eTag: `"${draft.version}"` },
    },
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each([
  [412, "PreconditionFailed"],
  [428, "PreconditionRequired"],
] as const)(
  "keeps a %i precondition problem without a winning draft",
  async (status, type) => {
    // Arrange
    reply({ status, detail: "Check the version." }, status);
    // Act
    const result = await forms.updatePdfSettings("42", {
      version: "3",
      pdf: { usesFormTheme: true },
    });
    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {
        type,
        message: "Check the version.",
        details: { statusCode: status },
      },
    });
    if (!result.success) expect(result.error.details?.draft).toBeUndefined();
  },
);

it("rejects invalid path IDs and malformed versions before sending a request", async () => {
  // Arrange & Act
  const results = await Promise.all([
    forms.drafts.get("0"),
    forms.drafts.replace("bad", "0", "{}"),
    forms.drafts.discard(formId, "*"),
    forms.publications.get(formId, "bad"),
    forms.publications.get("bad", formId),
  ]);
  // Assert
  for (const result of results) {
    expect(result).toMatchObject({
      success: false,
      error: { type: ApiErrorType.ValidationError },
    });
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

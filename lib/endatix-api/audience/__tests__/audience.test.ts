import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience, buildListAudiencePeopleEndpoint } from "../audience";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  AudiencePeopleTestFilter,
} from "../types";

const FORM_ID = "1525035735390879744";
const MEMBERSHIP_ID = "1526934587983265792";
const PROPERTY_ID = "1526934587983265793";

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

describe("buildListAudiencePeopleEndpoint", () => {
  it("defaults to the API page size", () => {
    expect(buildListAudiencePeopleEndpoint(FORM_ID)).toBe(
      `/forms/${FORM_ID}/audience/people?page=1&pageSize=50`,
    );
  });

  it("sends the requested page and page size", () => {
    expect(
      buildListAudiencePeopleEndpoint(FORM_ID, { page: 3, pageSize: 5_000 }),
    ).toBe(`/forms/${FORM_ID}/audience/people?page=3&pageSize=5000`);
  });

  it("sends the test filter, and leaves out the default all", () => {
    expect(
      buildListAudiencePeopleEndpoint(FORM_ID, {
        test: AudiencePeopleTestFilter.Test,
      }),
    ).toBe(`/forms/${FORM_ID}/audience/people?page=1&pageSize=50&test=test`);
    expect(
      buildListAudiencePeopleEndpoint(FORM_ID, {
        test: AudiencePeopleTestFilter.All,
      }),
    ).toBe(`/forms/${FORM_ID}/audience/people?page=1&pageSize=50`);
  });
});

describe("Audience settings", () => {
  it("reads and writes /audience/settings", async () => {
    const settings = {
      identifierKind: AudienceIdentifierKind.Email,
      isLocked: false,
    };
    const get = vi.fn().mockResolvedValue(ApiResult.success(settings));
    const put = vi.fn().mockResolvedValue(ApiResult.success(settings));
    const audience = audienceWith({ get, put });

    await audience.getSettings();
    await audience.updateSettings(settings);

    expect(get).toHaveBeenCalledWith("/audience/settings");
    expect(put).toHaveBeenCalledWith("/audience/settings", settings);
  });
});

describe("Audience properties", () => {
  it("posts a new property and maps numeric ids to strings", async () => {
    const post = vi.fn().mockResolvedValue(
      ApiResult.success({
        id: 7,
        formId: 9,
        variableName: "department",
        name: "Department",
        dataType: AudienceDataType.Text,
        sortOrder: 0,
        dataListId: null,
        choicesJson: null,
        allowsOther: false,
      }),
    );
    const body = { name: "Department", dataType: AudienceDataType.Text };

    const result = await audienceWith({ post }).createProperty(FORM_ID, body);

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/properties`,
      body,
    );
    expect(result.success && result.data).toMatchObject({
      id: "7",
      formId: "9",
      dataListId: null,
    });
  });

  it("patches and deletes by property id", async () => {
    const patch = vi.fn().mockResolvedValue(ApiResult.validationError("x"));
    const del = vi.fn().mockResolvedValue(ApiResult.success("ok"));
    const audience = audienceWith({ patch, delete: del });
    const path = `/forms/${FORM_ID}/audience/properties/${PROPERTY_ID}`;

    await audience.updateProperty(FORM_ID, PROPERTY_ID, { name: "Team" });
    await audience.deleteProperty(FORM_ID, PROPERTY_ID);

    expect(patch).toHaveBeenCalledWith(path, { name: "Team" });
    expect(del).toHaveBeenCalledWith(path);
  });

  it("rejects an invalid form id without calling the API", async () => {
    const get = vi.fn();

    const result = await audienceWith({ get }).listProperties("bad");

    expect(get).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe("Audience people", () => {
  it("keeps the identifier exactly as the API returns it", async () => {
    const post = vi.fn().mockResolvedValue(
      ApiResult.success({
        membershipId: 11,
        audienceMemberId: 12,
        identifier: "Ext-ABC",
        values: { [PROPERTY_ID]: "Sales" },
      }),
    );

    const result = await audienceWith({ post }).createPerson(FORM_ID, {
      identifier: "Ext-ABC",
    });

    expect(result.success && result.data).toEqual({
      membershipId: "11",
      audienceMemberId: "12",
      identifier: "Ext-ABC",
      values: { [PROPERTY_ID]: "Sales" },
      isTest: false,
      link: { status: "none" },
    });
  });

  it("sends isTest on create and reads it back", async () => {
    const post = vi.fn().mockResolvedValue(
      ApiResult.success({
        membershipId: 11,
        audienceMemberId: 12,
        identifier: "tester@example.com",
        values: {},
        isTest: true,
      }),
    );
    const body = { identifier: "tester@example.com", isTest: true };

    const result = await audienceWith({ post }).createPerson(FORM_ID, body);

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/people`,
      body,
    );
    expect(result.success && result.data.isTest).toBe(true);
  });

  it("puts values and deletes by membership id", async () => {
    const put = vi.fn().mockResolvedValue(ApiResult.validationError("x"));
    const del = vi.fn().mockResolvedValue(ApiResult.success("ok"));
    const audience = audienceWith({ put, delete: del });
    const path = `/forms/${FORM_ID}/audience/people/${MEMBERSHIP_ID}`;
    const body = { values: { [PROPERTY_ID]: "Sales" } };

    await audience.updatePerson(FORM_ID, MEMBERSHIP_ID, body);
    await audience.deletePerson(FORM_ID, MEMBERSHIP_ID);

    expect(put).toHaveBeenCalledWith(path, body);
    expect(del).toHaveBeenCalledWith(path);
  });

  it("normalizes the people page", async () => {
    const get = vi.fn().mockResolvedValue(
      ApiResult.success({
        page: 1,
        pageSize: 50,
        totalRecords: 1,
        totalPages: 1,
        items: [
          {
            membershipId: 11,
            audienceMemberId: 12,
            identifier: "a@b.co",
            values: {},
          },
        ],
      }),
    );

    const result = await audienceWith({ get }).listPeople(FORM_ID);

    expect(result.success && result.data.items[0].membershipId).toBe("11");
    expect(result.success && result.data.hasNextPage).toBe(false);
  });
});

describe("Audience people link status", () => {
  const pageOf = (...items: unknown[]) =>
    ApiResult.success({
      page: 1,
      pageSize: 50,
      totalRecords: items.length,
      totalPages: 1,
      items,
    });
  const wirePerson = (membershipId: number, link?: unknown) => ({
    membershipId,
    audienceMemberId: membershipId + 100,
    identifier: `p${membershipId}@b.co`,
    values: {},
    link,
  });

  it("reads each link status, keeping the opened submission id", async () => {
    const get = vi.fn().mockResolvedValue(
      pageOf(
        wirePerson(1, { status: "none" }),
        wirePerson(2, { status: "issued" }),
        wirePerson(3, {
          status: "opened",
          openedAt: "2026-10-20T09:30:00Z",
          submissionId: "1562340635426422784",
        }),
        wirePerson(4, { status: "opened", openedAt: "2026-10-20T10:00:00Z" }),
      ),
    );

    const result = await audienceWith({ get }).listPeople(FORM_ID);

    expect(result.success && result.data.items.map((p) => p.link)).toEqual([
      { status: "none" },
      { status: "issued" },
      {
        status: "opened",
        openedAt: "2026-10-20T09:30:00Z",
        submissionId: "1562340635426422784",
      },
      { status: "opened", openedAt: "2026-10-20T10:00:00Z" },
    ]);
  });

  it("reads a person without a link field as none (an API before link status)", async () => {
    const get = vi.fn().mockResolvedValue(pageOf(wirePerson(1)));

    const result = await audienceWith({ get }).listPeople(FORM_ID);

    expect(result.success && result.data.items[0].link).toEqual({
      status: "none",
    });
  });
});

describe("Audience test submissions", () => {
  const SUBMISSION_ID = "1526934587983265799";

  it("opens a test submission for a person and maps the id to a string", async () => {
    const post = vi
      .fn()
      .mockResolvedValue(ApiResult.success({ submissionId: 21, token: "t1" }));

    const result = await audienceWith({ post }).openTestSubmission(
      FORM_ID,
      MEMBERSHIP_ID,
    );

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/test-submissions`,
      { membershipId: MEMBERSHIP_ID },
    );
    expect(result.success && result.data).toEqual({
      submissionId: "21",
      token: "t1",
    });
  });

  it("starts a test submission over by its id", async () => {
    const post = vi
      .fn()
      .mockResolvedValue(ApiResult.success({ submissionId: 22, token: "t2" }));

    const result = await audienceWith({ post }).restartTestSubmission(
      FORM_ID,
      SUBMISSION_ID,
      "old-token",
    );

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/test-submissions/${SUBMISSION_ID}/restart`,
      { token: "old-token" },
    );
    expect(result.success && result.data.submissionId).toBe("22");
  });

  it("rejects an invalid submission id without calling the API", async () => {
    const post = vi.fn();

    const result = await audienceWith({ post }).restartTestSubmission(
      FORM_ID,
      "bad",
      "old-token",
    );

    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe("Audience participant", () => {
  const MEMBER_ID = "1526934587983265795";
  const wireParticipant = {
    submissions: [
      {
        id: 5521,
        createdAt: "2026-10-21T09:00:00Z",
        completedAt: null,
        isComplete: false,
        isTest: true,
        snapshotSource: "test",
      },
      {
        id: 5520,
        createdAt: "2026-10-20T09:00:00Z",
        completedAt: "2026-10-20T09:05:00Z",
        isComplete: true,
        isTest: false,
      },
    ],
    submissionTotal: 37,
    membershipId: 981,
    audienceMemberId: 7,
    identifier: "P-1001",
    values: { "11": "Gold" },
    isTest: true,
    link: { status: "none" },
  };

  /** The wire above as the Hub reads it: ids as strings, a left-out source as null. */
  const MAPPED_PARTICIPANT = {
    membershipId: "981",
    audienceMemberId: "7",
    identifier: "P-1001",
    values: { "11": "Gold" },
    isTest: true,
    link: { status: "none" },
    submissionTotal: 37,
    submissions: [
      {
        id: "5521",
        createdAt: "2026-10-21T09:00:00Z",
        completedAt: null,
        isComplete: false,
        isTest: true,
        snapshotSource: "test",
      },
      {
        id: "5520",
        createdAt: "2026-10-20T09:00:00Z",
        completedAt: "2026-10-20T09:05:00Z",
        isComplete: true,
        isTest: false,
        snapshotSource: null,
      },
    ],
  };

  it("reads one participant by member id and maps ids to strings", async () => {
    const get = vi.fn().mockResolvedValue(ApiResult.success(wireParticipant));

    const result = await audienceWith({ get }).getParticipant(
      FORM_ID,
      MEMBER_ID,
    );

    expect(get).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/people/${MEMBER_ID}`,
    );
    expect(result.success && result.data).toEqual(MAPPED_PARTICIPANT);
  });

  it("reads an unknown Snapshot source as none", async () => {
    const wire = {
      ...wireParticipant,
      submissions: [{ ...wireParticipant.submissions[0], snapshotSource: "x" }],
    };
    const get = vi.fn().mockResolvedValue(ApiResult.success(wire));

    const result = await audienceWith({ get }).getParticipant(
      FORM_ID,
      MEMBER_ID,
    );

    expect(
      result.success && result.data.submissions[0].snapshotSource,
    ).toBeNull();
  });

  it("reads a participant with no submissions left out as none of them", async () => {
    const { submissions: _, submissionTotal: __, ...wire } = wireParticipant;
    const get = vi.fn().mockResolvedValue(ApiResult.success(wire));

    const result = await audienceWith({ get }).getParticipant(
      FORM_ID,
      MEMBER_ID,
    );

    expect(result.success && result.data).toMatchObject({
      submissions: [],
      submissionTotal: 0,
    });
  });

  it("passes a 404 through so the page can say the participant is gone", async () => {
    const notFound = ApiResult.notFoundError(
      "Participant not found on this form.",
    );
    const get = vi.fn().mockResolvedValue(notFound);

    const result = await audienceWith({ get }).getParticipant(
      FORM_ID,
      MEMBER_ID,
    );

    expect(result).toBe(notFound);
  });

  it("rejects an invalid member id without calling the API", async () => {
    const get = vi.fn();

    const result = await audienceWith({ get }).getParticipant(FORM_ID, "7/x");

    expect(get).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe("Audience variables", () => {
  const variables = {
    variablePresets: {
      definition: { elements: [{ type: "text", name: "tier" }] },
      presets: [{ name: "maria@acme.test", variables: { tier: "gold" } }],
      totalPresets: 1,
    },
    coverage: { participants: { test: 0, real: 0 }, properties: [] },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    readOnlyPresets: [],
  };

  it("reads the form's variables for the designer", async () => {
    const get = vi.fn().mockResolvedValue(ApiResult.success(variables));

    const result = await audienceWith({ get }).getVariables(FORM_ID);

    expect(get).toHaveBeenCalledWith(`/forms/${FORM_ID}/audience/variables`);
    expect(result.success && result.data).toEqual(variables);
  });

  it("rejects an invalid form id without calling the API", async () => {
    const get = vi.fn();

    const result = await audienceWith({ get }).getVariables("7/x");

    expect(get).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

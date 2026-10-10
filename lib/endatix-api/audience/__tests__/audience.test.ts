import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience, buildListAudiencePeopleEndpoint } from "../audience";
import { AudienceDataType, AudienceIdentifierKind } from "../types";

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
    });
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

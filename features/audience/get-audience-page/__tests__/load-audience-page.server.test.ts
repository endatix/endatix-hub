import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { loadAudiencePage } from "../load-audience-page.server";

vi.mock("server-only", () => ({}));

const FORM_ID = "1525035735390879744";

const listPeople = vi.fn();
const api = {
  audience: {
    getSettings: vi.fn().mockResolvedValue(ApiResult.success({})),
    listProperties: vi.fn().mockResolvedValue(ApiResult.success([])),
    listPeople,
  },
} as never;

const page = (totalRecords: number) =>
  ApiResult.success({
    items: [],
    page: 1,
    pageSize: 50,
    totalRecords,
    totalPages: 1,
    hasNextPage: false,
  });

const paging = { page: 1, pageSize: 50, test: AudiencePeopleTestFilter.All };
const capabilities = {
  canManageMatchKey: false,
  canEdit: true,
  canTest: true,
  canCopyTestLink: true,
};

describe("loadAudiencePage", () => {
  beforeEach(() => {
    listPeople.mockReset();
    listPeople.mockImplementation(async (_, request) =>
      request.test === AudiencePeopleTestFilter.Test ? page(3) : page(10),
    );
  });

  it("counts the form's test participants for a reader who may download test links", async () => {
    const result = await loadAudiencePage({
      api,
      formId: FORM_ID,
      paging,
      ...capabilities,
      canMintTestLinks: true,
    });

    expect(Result.isSuccess(result) && result.value.testParticipants).toBe(3);
    expect(listPeople).toHaveBeenCalledWith(FORM_ID, {
      page: 1,
      pageSize: 1,
      test: AudiencePeopleTestFilter.Test,
    });
  });

  it("reads no count for anyone else", async () => {
    const result = await loadAudiencePage({
      api,
      formId: FORM_ID,
      paging,
      ...capabilities,
      canMintTestLinks: false,
    });

    expect(Result.isSuccess(result) && result.value.testParticipants).toBe(0);
    expect(listPeople).toHaveBeenCalledTimes(1);
  });

  it("keeps the page when the count fails, and offers no download", async () => {
    listPeople.mockImplementation(async (_, request) =>
      request.test === AudiencePeopleTestFilter.Test
        ? ApiResult.serverError("Down.")
        : page(10),
    );

    const result = await loadAudiencePage({
      api,
      formId: FORM_ID,
      paging,
      ...capabilities,
      canMintTestLinks: true,
    });

    expect(Result.isSuccess(result) && result.value.testParticipants).toBe(0);
  });
});

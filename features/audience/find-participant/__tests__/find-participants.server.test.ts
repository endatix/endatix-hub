import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import type { ListAudiencePeopleRequest } from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  FIND_PAGE_SIZE,
  findParticipants,
  parseFindRequest,
} from "../find-participants.server";

vi.mock("server-only", () => ({}));

const FORM_ID = "1525035735390879744";

function person(n: number, isTest: boolean): AudiencePerson {
  return {
    membershipId: String(900 + n),
    audienceMemberId: String(n),
    identifier: `p${n}@acme.test`,
    values: {},
    isTest,
    link: { status: "none" },
  };
}

/** A people list with `test` Test participants and `real` real ones, paged and searched like the API. */
function apiWith(test: number, real: number) {
  const people = [
    ...Array.from({ length: real }, (_, i) => person(i + 1, false)),
    ...Array.from({ length: test }, (_, i) => person(real + i + 1, true)),
  ];
  const listPeople = vi.fn(
    async (_formId: string, request: ListAudiencePeopleRequest) => {
      const pageSize = request.pageSize ?? 50;
      const page = request.page ?? 1;
      const matching = people.filter(
        (p) =>
          (request.test === "test" ? p.isTest : !p.isTest) &&
          p.identifier.includes(request.search ?? ""),
      );
      const items = matching.slice((page - 1) * pageSize, page * pageSize);
      const totalPages = Math.ceil(matching.length / pageSize);
      return ApiResult.success({
        page,
        pageSize,
        totalRecords: matching.length,
        totalPages,
        items,
        hasNextPage: page < totalPages,
      });
    },
  );
  return {
    api: { audience: { listPeople } } as unknown as EndatixApi,
    listPeople,
  };
}

async function identifiersOf(
  api: EndatixApi,
  request: Parameters<typeof findParticipants>[2],
) {
  const result = await findParticipants(api, FORM_ID, request);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
}

describe("findParticipants", () => {
  it("lists Test participants first, labelled, then real ones", async () => {
    // Arrange
    const { api } = apiWith(2, 3);

    // Act
    const page = await identifiersOf(api, { search: "" });

    // Assert
    expect(page.participants.map((p) => [p.identifier, p.isTest])).toEqual([
      ["p4@acme.test", true],
      ["p5@acme.test", true],
      ["p1@acme.test", false],
      ["p2@acme.test", false],
      ["p3@acme.test", false],
    ]);
    expect(page.next).toBeNull();
  });

  it("reads the next page of the same group until it runs out", async () => {
    // Arrange
    const { api } = apiWith(FIND_PAGE_SIZE + 1, FIND_PAGE_SIZE + 1);

    // Act
    const first = await identifiersOf(api, { search: "" });
    const second = await identifiersOf(api, {
      search: "",
      cursor: first.next!,
    });
    const last = await identifiersOf(api, {
      search: "",
      cursor: second.next!,
    });

    // Assert
    expect(first.participants).toHaveLength(FIND_PAGE_SIZE);
    expect(first.next).toEqual({ test: true, page: 2 });
    // The last Test participant, then the first page of real ones.
    expect(second.participants.map((p) => p.isTest)).toEqual([
      true,
      ...Array<boolean>(FIND_PAGE_SIZE).fill(false),
    ]);
    expect(second.next).toEqual({ test: false, page: 2 });
    expect(last.participants.map((p) => p.isTest)).toEqual([false]);
    expect(last.next).toBeNull();
  });

  it("goes straight to real participants when no Test participant matches", async () => {
    // Arrange
    const { api } = apiWith(0, 2);

    // Act
    const page = await identifiersOf(api, { search: "" });

    // Assert
    expect(page.participants.map((p) => p.identifier)).toEqual([
      "p1@acme.test",
      "p2@acme.test",
    ]);
    expect(page.next).toBeNull();
  });

  it("finds the 45th of 60 participants by search", async () => {
    // Arrange
    const { api, listPeople } = apiWith(5, 55);

    // Act
    const page = await identifiersOf(api, { search: " p45@ " });

    // Assert
    expect(page.participants.map((p) => p.identifier)).toEqual([
      "p45@acme.test",
    ]);
    expect(listPeople).toHaveBeenCalledWith(
      FORM_ID,
      expect.objectContaining({ search: "p45@", test: "real" }),
    );
  });

  it("passes a failed read on", async () => {
    // Arrange
    const listPeople = vi
      .fn()
      .mockResolvedValue(ApiResult.notFoundError("Form not found."));
    const api = { audience: { listPeople } } as unknown as EndatixApi;

    // Act
    const result = await findParticipants(api, FORM_ID, { search: "" });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("parseFindRequest", () => {
  it("accepts a search and a cursor the picker sent", () => {
    expect(
      parseFindRequest({ search: "ana", cursor: { test: false, page: 2 } }),
    ).toEqual({ search: "ana", cursor: { test: false, page: 2 } });
  });

  it.each([
    ["no search", {}],
    ["a search that is not text", { search: 7 }],
    ["a search longer than an identifier", { search: "a".repeat(257) }],
    ["a page below 1", { search: "", cursor: { test: true, page: 0 } }],
    ["a fractional page", { search: "", cursor: { test: true, page: 1.5 } }],
    ["a cursor without its group", { search: "", cursor: { page: 2 } }],
  ])("refuses %s", (_, request) => {
    expect(parseFindRequest(request)).toBeNull();
  });
});

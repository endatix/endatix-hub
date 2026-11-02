import "server-only";

import { z } from "zod";
import type { EndatixApi } from "@/lib/endatix-api";
import {
  AudiencePeopleTestFilter,
  MAX_AUDIENCE_SEARCH_LENGTH,
} from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type {
  FindParticipantsRequest,
  FoundParticipant,
  FoundParticipants,
  ParticipantCursor,
} from "@/lib/personalization/authoring";

export const FIND_PAGE_SIZE = 25;

const findRequestSchema = z.object({
  search: z.string().max(MAX_AUDIENCE_SEARCH_LENGTH),
  cursor: z
    .object({ test: z.boolean(), page: z.number().int().min(1) })
    .optional(),
});

/** The picker's request as the server action received it; null when it is not one. */
export function parseFindRequest(raw: unknown): FindParticipantsRequest | null {
  const parsed = findRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const FIRST: ParticipantCursor = { test: true, page: 1 };

const REAL: ParticipantCursor = { test: false, page: 1 };

type GroupRead = { api: EndatixApi; formId: string; search: string };

/**
 * One page of the designer's Find participant: the participants list (`/people`) read twice over,
 * Test participants first, then real ones, so the API's own order (by when they were added) needs
 * no change. The last page of Test participants carries on with the first page of real ones, so
 * the list always fills enough to scroll while more are left. The first page usually holds every
 * Test participant, so the first page of real ones is read alongside it, not after it.
 */
export async function findParticipants(
  api: EndatixApi,
  formId: string,
  { search, cursor = FIRST }: FindParticipantsRequest,
): Promise<ApiResult<FoundParticipants>> {
  const group = { api, formId, search };
  const [read, realAhead] = await Promise.all([
    readGroupPage(group, cursor),
    cursor.test && cursor.page === 1 ? readGroupPage(group, REAL) : null,
  ]);
  if (!read.success) return read;

  const { participants, hasMore } = read.data;
  if (hasMore) {
    return ApiResult.success({ participants, next: nextPage(cursor) });
  }
  if (!cursor.test) return ApiResult.success({ participants, next: null });
  return carryOnWithReal(group, participants, realAhead);
}

type GroupPage = ApiResult<{
  participants: FoundParticipant[];
  hasMore: boolean;
}>;

async function readGroupPage(
  { api, formId, search }: GroupRead,
  cursor: ParticipantCursor,
): Promise<GroupPage> {
  const read = await api.audience.listPeople(formId, {
    test: cursor.test
      ? AudiencePeopleTestFilter.Test
      : AudiencePeopleTestFilter.Real,
    search: search.trim(),
    page: cursor.page,
    pageSize: FIND_PAGE_SIZE,
  });
  if (!read.success) return read;
  return ApiResult.success({
    participants: read.data.items.map((person) => toFound(person)),
    hasMore: read.data.hasNextPage,
  });
}

const toFound = ({
  audienceMemberId,
  identifier,
  isTest,
}: FoundParticipant): FoundParticipant => ({
  audienceMemberId,
  identifier,
  isTest,
});

const nextPage = (cursor: ParticipantCursor): ParticipantCursor => ({
  ...cursor,
  page: cursor.page + 1,
});

async function carryOnWithReal(
  group: GroupRead,
  tests: FoundParticipant[],
  realAhead: GroupPage | null,
): Promise<ApiResult<FoundParticipants>> {
  const real = realAhead ?? (await readGroupPage(group, REAL));
  if (!real.success) return real;
  return ApiResult.success({
    participants: [...tests, ...real.data.participants],
    next: real.data.hasMore ? nextPage(REAL) : null,
  });
}

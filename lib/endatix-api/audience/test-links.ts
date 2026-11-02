import type { EndatixApi } from "../endatix-api";
import { ApiResult, isValidationError } from "../shared/api-result";
import {
  formAudiencePath,
  mapMintedTestLink,
  requireEndatixId,
  type WireMintedTestLink,
} from "./mappers";
import type { MintedTestLink, MintTestLinksRequest } from "./types";

/** Refused by the route's validator before anything is read, so it opens nothing. */
const PROBE: MintTestLinksRequest = {
  membershipIds: [],
  runsEach: 1,
  expiryMinutes: 60,
};

const testLinksPath = (formId: string) =>
  formAudiencePath(formId, "test-links");

/**
 * Test links for Test participants in one call: `runsEach` new test submissions each, with a
 * `submit` token. All or nothing, and not idempotent: a retry opens a second set.
 */
export async function mintTestLinks(
  endatix: EndatixApi,
  formId: string,
  request: MintTestLinksRequest,
): Promise<ApiResult<MintedTestLink[]>> {
  const idCheck = requireEndatixId(formId, "formId");
  if (!idCheck.success) return idCheck;

  const response = await endatix.post<{ items: WireMintedTestLink[] }>(
    testLinksPath(formId),
    request,
  );
  if (!response.success) return response;
  return ApiResult.success(
    response.data.items.map((link) => mapMintedTestLink(link)),
  );
}

/**
 * Whether this API has the test links route. An empty set is a 400 from its validator, and an
 * API without the route answers 404; any other failure, or a form id that is not an Endatix id,
 * is no answer, so the route is not used.
 */
export async function supportsTestLinks(
  endatix: EndatixApi,
  formId: string,
): Promise<boolean> {
  if (!requireEndatixId(formId, "formId").success) return false;
  const probe = await endatix.post<unknown>(testLinksPath(formId), PROBE);
  return isValidationError(probe);
}

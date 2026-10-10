import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { ApiResult } from "../shared/api-result";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "../shared/paged-response";
import type { PagedResponse } from "../shared/types";
import type {
  AudienceImportResult,
  AudiencePerson,
  AudienceProperty,
} from "./types";

export type WireProperty = Omit<
  AudienceProperty,
  "id" | "formId" | "dataListId"
> & {
  id: string | number;
  formId: string | number;
  dataListId?: string | number | null;
};

export type WirePerson = {
  membershipId: string | number;
  audienceMemberId: string | number;
  identifier: string;
  values: Record<string, string>;
};

export function mapProperty(wire: WireProperty): AudienceProperty {
  return {
    id: String(wire.id),
    formId: String(wire.formId),
    variableName: wire.variableName,
    name: wire.name,
    dataType: wire.dataType,
    sortOrder: wire.sortOrder,
    dataListId:
      wire.dataListId === null || wire.dataListId === undefined
        ? wire.dataListId
        : String(wire.dataListId),
    choicesJson: wire.choicesJson,
    allowsOther: wire.allowsOther,
  };
}

export function mapPerson(wire: WirePerson): AudiencePerson {
  return {
    membershipId: String(wire.membershipId),
    audienceMemberId: String(wire.audienceMemberId),
    identifier: wire.identifier,
    values: wire.values ?? {},
  };
}

export function formAudiencePath(
  formId: string,
  ...segments: string[]
): string {
  const base = `/forms/${formId}/audience`;
  return segments.length === 0 ? base : `${base}/${segments.join("/")}`;
}

export function requireEndatixId(
  id: string,
  paramName: string,
): ApiResult<string> {
  const result = validateEndatixId(id, paramName);
  return Result.isError(result)
    ? ApiResult.validationError(result.message)
    : ApiResult.success(result.value);
}

export function requireFormAndEntityIds(
  formId: string,
  entityId: string,
  entityParam: string,
): ApiResult<void> {
  const formCheck = requireEndatixId(formId, "formId");
  if (!formCheck.success) {
    return formCheck;
  }

  const entityCheck = requireEndatixId(entityId, entityParam);
  if (!entityCheck.success) {
    return entityCheck;
  }

  return ApiResult.success(undefined);
}

export function mapPropertyResult(
  response: ApiResult<WireProperty>,
): ApiResult<AudienceProperty> {
  return response.success
    ? ApiResult.success(mapProperty(response.data))
    : response;
}

export function mapPersonResult(
  response: ApiResult<WirePerson>,
): ApiResult<AudiencePerson> {
  return response.success
    ? ApiResult.success(mapPerson(response.data))
    : response;
}

export type WireImport = Omit<AudienceImportResult, "importId"> & {
  importId: string | number;
};

export function mapImportResult(
  response: ApiResult<WireImport>,
): ApiResult<AudienceImportResult> {
  return response.success
    ? ApiResult.success({
        ...response.data,
        importId: String(response.data.importId),
      })
    : response;
}

export function mapPeoplePageResult(
  response: ApiResult<PagedResponse<WirePerson>>,
): ApiResult<NormalizedPagedResponse<AudiencePerson>> {
  if (!response.success) {
    return response;
  }

  return ApiResult.success(
    normalizePagedResponse({
      ...response.data,
      items: response.data.items.map(mapPerson),
    }),
  );
}

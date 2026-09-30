import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { NormalizedPagedResponse } from "../shared/paged-response";
import {
  appendPagingQueryParams,
  buildEndpointWithQuery,
} from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import {
  formAudiencePath,
  mapPeoplePageResult,
  mapPersonResult,
  mapProperty,
  mapPropertyResult,
  requireEndatixId,
  requireFormAndEntityIds,
  type WirePerson,
  type WireProperty,
} from "./mappers";
import type {
  AudiencePerson,
  AudienceProperty,
  AudienceSettings,
  CreateAudiencePersonRequest,
  CreateAudiencePropertyRequest,
  ListAudiencePeopleRequest,
  UpdateAudiencePersonRequest,
  UpdateAudiencePropertyRequest,
  UpdateAudienceSettingsRequest,
} from "./types";

export type AudiencePeoplePage = NormalizedPagedResponse<AudiencePerson>;

const SETTINGS_PATH = "/audience/settings";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

export function buildListAudiencePeopleEndpoint(
  formId: string,
  request: ListAudiencePeopleRequest = {},
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  return buildEndpointWithQuery(
    formAudiencePath(formId, "people"),
    searchParams,
  );
}

export class Audience {
  constructor(private readonly endatix: EndatixApi) {}

  async getSettings(): Promise<ApiResult<AudienceSettings>> {
    return this.endatix.get<AudienceSettings>(SETTINGS_PATH);
  }

  async updateSettings(
    body: UpdateAudienceSettingsRequest,
  ): Promise<ApiResult<AudienceSettings>> {
    return this.endatix.put<AudienceSettings>(SETTINGS_PATH, body);
  }

  async listProperties(
    formId: string,
  ): Promise<ApiResult<AudienceProperty[]>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) {
      return idCheck;
    }

    const response = await this.endatix.get<WireProperty[]>(
      formAudiencePath(formId, "properties"),
    );
    if (!response.success) {
      return response;
    }

    return ApiResult.success(response.data.map(mapProperty));
  }

  async createProperty(
    formId: string,
    body: CreateAudiencePropertyRequest,
  ): Promise<ApiResult<AudienceProperty>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) {
      return idCheck;
    }

    return mapPropertyResult(
      await this.endatix.post<WireProperty>(
        formAudiencePath(formId, "properties"),
        body,
      ),
    );
  }

  async updateProperty(
    formId: string,
    propertyId: string,
    body: UpdateAudiencePropertyRequest,
  ): Promise<ApiResult<AudienceProperty>> {
    const idsCheck = requireFormAndEntityIds(formId, propertyId, "propertyId");
    if (!idsCheck.success) {
      return idsCheck;
    }

    return mapPropertyResult(
      await this.endatix.patch<WireProperty>(
        formAudiencePath(formId, "properties", propertyId),
        body,
      ),
    );
  }

  async deleteProperty(
    formId: string,
    propertyId: string,
  ): Promise<ApiResult<void>> {
    const idsCheck = requireFormAndEntityIds(formId, propertyId, "propertyId");
    if (!idsCheck.success) {
      return idsCheck;
    }

    return this.endatix.delete(
      formAudiencePath(formId, "properties", propertyId),
    );
  }

  async listPeople(
    formId: string,
    request: ListAudiencePeopleRequest = {},
  ): Promise<ApiResult<AudiencePeoplePage>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapPeoplePageResult(
      await this.endatix.get<PagedResponse<WirePerson>>(
        buildListAudiencePeopleEndpoint(formId, request),
      ),
    );
  }

  async createPerson(
    formId: string,
    body: CreateAudiencePersonRequest,
  ): Promise<ApiResult<AudiencePerson>> {
    const idCheck = requireEndatixId(formId, "formId");
    if (!idCheck.success) return idCheck;

    return mapPersonResult(
      await this.endatix.post<WirePerson>(
        formAudiencePath(formId, "people"),
        body,
      ),
    );
  }

  async updatePerson(
    formId: string,
    membershipId: string,
    body: UpdateAudiencePersonRequest,
  ): Promise<ApiResult<AudiencePerson>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      membershipId,
      "membershipId",
    );
    if (!idsCheck.success) return idsCheck;

    return mapPersonResult(
      await this.endatix.put<WirePerson>(
        formAudiencePath(formId, "people", membershipId),
        body,
      ),
    );
  }

  async deletePerson(
    formId: string,
    membershipId: string,
  ): Promise<ApiResult<void>> {
    const idsCheck = requireFormAndEntityIds(
      formId,
      membershipId,
      "membershipId",
    );
    if (!idsCheck.success) {
      return idsCheck;
    }

    return this.endatix.delete(
      formAudiencePath(formId, "people", membershipId),
    );
  }
}

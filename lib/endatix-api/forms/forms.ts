import { appendDateRangeFilters } from "../shared/list-query";
import {
  appendQueryParam,
  appendQueryParams,
  buildEndpointWithQuery,
} from "../shared/query-params";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { PagedResponse } from "../shared/types";
import { Form } from "@/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import {
  CreateFormAccessTokenRequest,
  FormAccessTokenResponse,
  FormsListRequest,
  FormPdfSettings,
  GetPublicFormAccessRequest,
  PublicFormAccessResponse,
  UpdateFormRequest,
} from "./types";
import { CreateFormRequest } from "@/lib/form-types";
import { FormDrafts } from "./drafts";
import { FormPublications } from "./publications";
import { ifMatch } from "./versioned-form-request";

export class Forms {
  private _drafts?: FormDrafts;
  private _publications?: FormPublications;

  get publications(): FormPublications {
    return (this._publications ??= new FormPublications(this.endatix));
  }

  get drafts(): FormDrafts {
    return (this._drafts ??= new FormDrafts(this.endatix));
  }

  constructor(private readonly endatix: EndatixApi) {}

  async create(request: CreateFormRequest): Promise<ApiResult<Form>> {
    return this.endatix.post<Form>("/forms", request);
  }

  async list(
    request: FormsListRequest = {},
  ): Promise<ApiResult<PagedResponse<Form>>> {
    return this.endatix.get<PagedResponse<Form>>(
      buildListFormsEndpoint(request),
    );
  }

  async get(formId: string): Promise<ApiResult<Form>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }
    return this.endatix.get<Form>(`/forms/${validateFormIdResult.value}`);
  }

  async update(
    formId: string,
    request: UpdateFormRequest,
  ): Promise<ApiResult<void>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }
    return this.endatix.patch<void>(
      `/forms/${validateFormIdResult.value}`,
      request,
    );
  }

  async delete(formId: string): Promise<ApiResult<void>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }
    return this.endatix.delete<void>(`/forms/${validateFormIdResult.value}`);
  }

  async getSettings(formId: string): Promise<ApiResult<FormPdfSettings>> {
    const id = validateEndatixId(formId, "formId");
    if (Result.isError(id)) return ApiResult.validationError(id.message);
    return this.endatix.get(`/forms/${id.value}/settings`);
  }

  async updatePdfSettings(
    formId: string,
    settings: FormPdfSettings,
  ): Promise<ApiResult<FormPdfSettings>> {
    const id = validateEndatixId(formId, "formId");
    if (Result.isError(id)) return ApiResult.validationError(id.message);
    if (
      typeof settings?.version !== "string" ||
      !/^\d{1,19}$/.test(settings.version) ||
      typeof settings.pdf?.usesFormTheme !== "boolean"
    ) {
      return ApiResult.validationError("Invalid PDF settings or version.");
    }
    return this.endatix.patch(
      `/forms/${id.value}/settings`,
      { pdf: { usesFormTheme: settings.pdf.usesFormTheme } },
      ifMatch(settings.version),
    );
  }

  /**
   * Gets a form access JWT for browser calls to public form related endpoints & resources.
   */
  async createFormAccessToken(
    formId: string,
    body: CreateFormAccessTokenRequest = {},
  ): Promise<ApiResult<FormAccessTokenResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.endatix.post<FormAccessTokenResponse>(
      `/public/forms/${validateFormIdResult.value}/access-tokens`,
      body,
      { requireAuth: false },
    );
  }

  /**
   * Resolves public-form permissions via OSS PublicFormAccessPolicy.
   * Pass hub session token for private forms; optional respondent token as query params.
   */
  async getPublicFormAccess(
    formId: string,
    request: GetPublicFormAccessRequest = {},
    requireAuth = false,
  ): Promise<ApiResult<PublicFormAccessResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const params = new URLSearchParams();
    if (request.token) {
      params.set("token", request.token);
    }
    if (request.tokenType) {
      params.set("tokenType", request.tokenType);
    }
    const query = params.toString();
    const path = `/public/forms/${validateFormIdResult.value}/access${
      query ? `?${query}` : ""
    }`;

    return this.endatix.get<PublicFormAccessResponse>(path, {
      requireAuth,
      headers: request.acceptLanguage
        ? { "Accept-Language": request.acceptLanguage }
        : undefined,
    });
  }
}

export function buildListFormsEndpoint(request: FormsListRequest): string {
  const searchParams = new URLSearchParams();
  appendQueryParams(searchParams, [
    ["page", request.page],
    ["pageSize", request.pageSize],
    ["search", request.search],
    ["isEnabled", request.isEnabled],
    ["isPublic", request.isPublic],
    ["sortBy", request.sortBy],
    ["sortDir", request.sortDir],
    ["folderId", request.folderId],
  ]);
  appendDateRangeFilters(searchParams, request, ["created", "modified"]);

  if (request.unassignedOnly) {
    appendQueryParam(searchParams, "filter", "folderId:null");
  } else if (request.themeId) {
    appendQueryParam(searchParams, "filter", `themeId:${request.themeId}`);
  } else if (request.filter) {
    appendQueryParam(searchParams, "filter", request.filter);
  }

  return buildEndpointWithQuery("/forms", searchParams);
}

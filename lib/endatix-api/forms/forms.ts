import { Form } from "@/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import {
  CreateFormAccessTokenRequest,
  FormAccessTokenResponse,
  FormsListRequest,
  GetPublicFormAccessRequest,
  PublicFormAccessResponse,
  UpdateFormRequest,
} from "./types";
import { CreateFormRequest } from "@/lib/form-types";

export class Forms {
  constructor(private readonly endatix: EndatixApi) {}

  async create(request: CreateFormRequest): Promise<ApiResult<Form>> {
    return this.endatix.post<Form>("/forms", request);
  }

  async list(request?: FormsListRequest): Promise<ApiResult<Form[]>> {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (request?.filter) {
      params.set("filter", request.filter);
    }
    if (request?.folderId) {
      params.set("folderId", request.folderId);
    }
    return this.endatix.get<Form[]>(`/forms?${params.toString()}`);
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
    const path = `/access/public/forms/${validateFormIdResult.value}${
      query ? `?${query}` : ""
    }`;

    return this.endatix.get<PublicFormAccessResponse>(path, { requireAuth });
  }
}

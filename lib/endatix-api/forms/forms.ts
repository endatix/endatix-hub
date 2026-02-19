import { Form } from "@/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { FormsListRequest, UpdateFormRequest } from "./types";
import { CreateFormRequest } from "@/lib/form-types";

export class Forms {
  constructor(private readonly endatix: EndatixApi) {}

  async create(request: CreateFormRequest): Promise<ApiResult<Form>> {
    return this.endatix.post<Form>("/forms", request);
  }

  async list(request?: FormsListRequest): Promise<ApiResult<Form[]>> {
    const filter = request?.filter ?? "pageSize=100";
    return this.endatix.get<Form[]>(`/forms?${filter}`);
  }

  async get(formId: string): Promise<ApiResult<Form>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }
    return this.endatix.get<Form>(`/forms/${validateFormIdResult.value}`);
  }

  async update(formId: string, request: UpdateFormRequest): Promise<ApiResult<void>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }
    return this.endatix.patch<void>(`/forms/${validateFormIdResult.value}`, request);
  }

  async delete(formId: string): Promise<ApiResult<void>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }
    return this.endatix.delete<void>(`/forms/${validateFormIdResult.value}`);
  }
}

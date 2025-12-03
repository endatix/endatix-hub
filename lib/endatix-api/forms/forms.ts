import { Form } from "@/types";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { FormsListRequest } from "./types";
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
}

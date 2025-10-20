import { Form } from "@/types";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { FormsListRequest } from "./types";

export class Forms {
  constructor(private readonly endatix: EndatixApi) {}

  async list(request: FormsListRequest): Promise<ApiResult<Form[]>> {
    const filter = request.filter ?? "pageSize=100";
    return this.endatix.get<Form[]>(`/forms?${filter}`);
  }
}

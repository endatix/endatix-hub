import type { EndatixApi } from "../endatix-api";
import type { ApiResult } from "../shared/api-result";
import type { ExportCapabilityDto } from "./export-format-types";

export class ExportCapabilities {
  constructor(private readonly endatix: EndatixApi) {}

  async list(): Promise<ApiResult<ExportCapabilityDto[]>> {
    return this.endatix.get<ExportCapabilityDto[]>(
      "/settings/export-capabilities",
    );
  }
}

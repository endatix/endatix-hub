import type { EndatixApi } from "../endatix-api";
import type { ApiResult } from "../shared/api-result";
import type { ColumnAliasNamingConventionDto } from "./export-format-types";

export class ExportNamingConventions {
  constructor(private readonly endatix: EndatixApi) {}

  async list(): Promise<ApiResult<ColumnAliasNamingConventionDto[]>> {
    return this.endatix.get<ColumnAliasNamingConventionDto[]>(
      "/settings/export-naming-conventions",
    );
  }
}

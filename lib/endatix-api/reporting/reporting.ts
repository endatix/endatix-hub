import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { ExportFormats } from "./export-formats";
import { ExportMappings } from "./export-mappings";
import { ExportCapabilities } from "./export-capabilities";
import { ExportNamingConventions } from "./export-naming-conventions";
import type {
  BackfillSubmissionsRequest,
  BackfillSubmissionsResponse,
  CompileFormSchemaResponse,
  FormSchemaLocalesResponse,
} from "./types";

export class Reporting {
  private _exportFormats?: ExportFormats;
  private _exportMappings?: ExportMappings;
  private _exportCapabilities?: ExportCapabilities;
  private _exportNamingConventions?: ExportNamingConventions;

  constructor(private readonly endatix: EndatixApi) {}

  get exportFormats(): ExportFormats {
    this._exportFormats ??= new ExportFormats(this.endatix);
    return this._exportFormats;
  }

  get exportMappings(): ExportMappings {
    this._exportMappings ??= new ExportMappings(this.endatix);
    return this._exportMappings;
  }

  get exportCapabilities(): ExportCapabilities {
    this._exportCapabilities ??= new ExportCapabilities(this.endatix);
    return this._exportCapabilities;
  }

  get exportNamingConventions(): ExportNamingConventions {
    this._exportNamingConventions ??= new ExportNamingConventions(this.endatix);
    return this._exportNamingConventions;
  }

  async compileSchema(
    formId: string,
  ): Promise<ApiResult<CompileFormSchemaResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.endatix.post<CompileFormSchemaResponse>(
      `/forms/${validateFormIdResult.value}/reporting/compile-schema`,
      {},
    );
  }

  async getFormSchemaLocales(
    formId: string,
  ): Promise<ApiResult<FormSchemaLocalesResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.endatix.get<FormSchemaLocalesResponse>(
      `/forms/${validateFormIdResult.value}/reporting/locales`,
    );
  }

  async backfillSubmissions(
    formId: string,
    request: BackfillSubmissionsRequest = {},
  ): Promise<ApiResult<BackfillSubmissionsResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.endatix.post<BackfillSubmissionsResponse>(
      `/forms/${validateFormIdResult.value}/submissions/backfill`,
      {
        batchSize: request.batchSize,
        afterSubmissionId: request.afterSubmissionId,
        force: request.force,
      },
    );
  }
}

export type {
  ColumnAliasNamingConventionDto,
  ExportCapabilityDto,
  ExportDeliveryFormat,
  ExportFormatListItem,
  ExportFormatSettingsInput,
  ExportMappingListItem,
  ExportProfile,
  ExportTarget,
  CreateExportFormatRequestBody,
  UpdateExportFormatRequestBody,
  UpsertExportMappingRequestBody,
} from "./export-format-types";

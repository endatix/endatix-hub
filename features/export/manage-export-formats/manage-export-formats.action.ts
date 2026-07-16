"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  buildExportFormatSettingsInput,
  getColumnAliasNamingConvention,
  getExportCapabilityForSelection,
  getExportFormatSettingsFieldVisibility,
} from "@/lib/endatix-api/reporting/export-format-types";
import type {
  ColumnAliasNamingConventionDto,
  CreateExportFormatRequestBody,
  ExportCapabilityDto,
  ExportDeliveryFormat,
  ExportProfile,
  ExportTarget,
  UpdateExportFormatRequestBody,
} from "@/lib/endatix-api/reporting/reporting";
import { normalizeExportCapabilities } from "@/lib/endatix-api/reporting/normalize-export-capabilities";
import { normalizeExportNamingConventions } from "@/lib/endatix-api/reporting/normalize-export-naming-conventions";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { getStringFormValue } from "@/lib/utils/form-data-utils";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

const exportTargetSchema = z.enum(["Submissions", "Codebook"]);
const deliveryFormatSchema = z.enum(["Csv", "Json"]);
const profileSchema = z.enum(["Native", "Shoji"]);
const exportFormatIdSchema = createEndatixIdSchema("exportFormatId");

const exportFormatSettingsFieldsSchema = z.object({
  exportTarget: exportTargetSchema,
  deliveryFormat: deliveryFormatSchema,
  profile: profileSchema,
  aliasProfile: z.string().trim().min(1),
  keySeparator: z.string().trim().min(1),
  includeTestSubmissions: z.boolean().optional(),
});

const createExportFormatSchema = exportFormatSettingsFieldsSchema.extend({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
});

const updateExportFormatSchema = exportFormatSettingsFieldsSchema.extend({
  exportFormatId: exportFormatIdSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
});

const deleteExportFormatSchema = z.object({
  exportFormatId: exportFormatIdSchema,
});

const upsertDefaultMappingSchema = z.object({
  exportFormatId: exportFormatIdSchema,
});

const EXPORT_FORMATS_PATH = "/settings/organization/export-formats";
const LOGGER_NAME = "export.manage-export-formats";
const REPORTING_EXPORT_DISABLED_MESSAGE =
  "Reporting export is not enabled for this environment.";

function getBooleanFormValue(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "true" || value === "on";
}

function validateSettingsFields(
  data: z.infer<typeof exportFormatSettingsFieldsSchema>,
): z.ZodError | null {
  const visibility = getExportFormatSettingsFieldVisibility(data.exportTarget);
  const issues: z.ZodIssue[] = [];

  if (!data.aliasProfile) {
    issues.push({
      code: "custom",
      path: ["aliasProfile"],
      message: "Column naming is required.",
    });
  }

  if (!data.keySeparator) {
    issues.push({
      code: "custom",
      path: ["keySeparator"],
      message: "Key separator is required.",
    });
  }

  if (!visibility.includeTestSubmissions && data.includeTestSubmissions) {
    issues.push({
      code: "custom",
      path: ["includeTestSubmissions"],
      message: "Include test submissions applies only to submission exports.",
    });
  }

  return issues.length > 0 ? new z.ZodError(issues) : null;
}

function validateCatalogMembership(
  selection: {
    exportTarget: ExportTarget;
    deliveryFormat: ExportDeliveryFormat;
    profile: ExportProfile;
    aliasProfile: string;
  },
  capabilities: ReadonlyArray<ExportCapabilityDto>,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto>,
): z.ZodError | null {
  const issues: z.ZodIssue[] = [];

  const capability = getExportCapabilityForSelection(
    selection.exportTarget,
    selection.deliveryFormat,
    selection.profile,
    capabilities,
  );
  if (!capability) {
    issues.push({
      code: "custom",
      path: ["exportTarget"],
      message:
        "Selected export type is not supported by the available capabilities.",
    });
  }

  if (
    !getColumnAliasNamingConvention(selection.aliasProfile, namingConventions)
  ) {
    issues.push({
      code: "custom",
      path: ["aliasProfile"],
      message: "Selected column naming is not supported.",
    });
  }

  return issues.length > 0 ? new z.ZodError(issues) : null;
}

async function loadExportCatalogs(api: EndatixApi): Promise<
  Result<{
    capabilities: ExportCapabilityDto[];
    namingConventions: ColumnAliasNamingConventionDto[];
  }>
> {
  const [capabilitiesApiResult, namingApiResult] = await Promise.all([
    api.reporting.exportCapabilities.list(),
    api.reporting.exportNamingConventions.list(),
  ]);

  const capabilitiesResult = toResult(capabilitiesApiResult, {
    fallbackMessage: "Failed to load export capabilities.",
    logMessage: "Failed to load export capabilities for catalog validation.",
    loggerName: LOGGER_NAME,
  });
  if (Result.isError(capabilitiesResult)) {
    return capabilitiesResult;
  }

  const namingResult = toResult(namingApiResult, {
    fallbackMessage: "Failed to load column naming conventions.",
    logMessage:
      "Failed to load export naming conventions for catalog validation.",
    loggerName: LOGGER_NAME,
  });
  if (Result.isError(namingResult)) {
    return namingResult;
  }

  return Result.success({
    capabilities: normalizeExportCapabilities(capabilitiesResult.value),
    namingConventions: normalizeExportNamingConventions(namingResult.value),
  });
}

export type ExportFormatActionState = ServerActionState<{
  exportFormatId?: string;
  name?: string;
}>;

async function requireReportingExportSettings(): Promise<ExportFormatActionState | null> {
  const reportingExportEnabled = await reportingExportFlag();
  if (reportingExportEnabled) {
    return null;
  }

  return {
    isSuccess: false,
    message: REPORTING_EXPORT_DISABLED_MESSAGE,
  };
}

export async function createExportFormatAction(
  _prevState: ExportFormatActionState,
  formData: FormData,
): Promise<ExportFormatActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageSettings);

  const disabled = await requireReportingExportSettings();
  if (disabled) {
    return disabled;
  }

  const rawData = {
    name: getStringFormValue(formData, "name"),
    exportTarget: getStringFormValue(formData, "exportTarget"),
    deliveryFormat: getStringFormValue(formData, "deliveryFormat"),
    profile: getStringFormValue(formData, "profile"),
    description: getStringFormValue(formData, "description"),
    aliasProfile: getStringFormValue(formData, "aliasProfile"),
    keySeparator: getStringFormValue(formData, "keySeparator") || undefined,
    includeTestSubmissions: getBooleanFormValue(
      formData,
      "includeTestSubmissions",
    ),
  };

  const validated = createExportFormatSchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const settingsValidationError = validateSettingsFields(validated.data);
  if (settingsValidationError) {
    return ServerActionState.fromZodError(settingsValidationError, rawData);
  }

  const api = new EndatixApi(session?.accessToken);
  const catalogsResult = await loadExportCatalogs(api);
  if (Result.isError(catalogsResult)) {
    return {
      isSuccess: false,
      message: catalogsResult.message,
      data: rawData,
    };
  }

  const catalogValidationError = validateCatalogMembership(
    validated.data,
    catalogsResult.value.capabilities,
    catalogsResult.value.namingConventions,
  );
  if (catalogValidationError) {
    return ServerActionState.fromZodError(catalogValidationError, rawData);
  }

  const body: CreateExportFormatRequestBody = {
    name: validated.data.name,
    exportTarget: validated.data.exportTarget as ExportTarget,
    deliveryFormat: validated.data.deliveryFormat as ExportDeliveryFormat,
    profile: validated.data.profile as ExportProfile,
    description: validated.data.description,
    settings: buildExportFormatSettingsInput(
      validated.data.exportTarget,
      validated.data.profile,
      {
        aliasProfile: validated.data.aliasProfile,
        keySeparator: validated.data.keySeparator,
        includeTestSubmissions: validated.data.includeTestSubmissions,
      },
    ),
  };

  const apiResult = await api.reporting.exportFormats.create(body);

  if (ApiResult.isSuccess(apiResult)) {
    revalidatePath(EXPORT_FORMATS_PATH);
    return { isSuccess: true, message: "Export format created." };
  }

  const result = toResult(apiResult, {
    fallbackMessage: "Failed to create export format.",
    logMessage: "Failed to create export format.",
    loggerName: LOGGER_NAME,
  });

  return {
    isSuccess: false,
    message: Result.isError(result)
      ? result.message
      : "Failed to create export format.",
    data: rawData,
  };
}

export async function updateExportFormatAction(
  _prevState: ExportFormatActionState,
  formData: FormData,
): Promise<ExportFormatActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageSettings);

  const disabled = await requireReportingExportSettings();
  if (disabled) {
    return disabled;
  }

  const rawData = {
    exportFormatId: getStringFormValue(formData, "exportFormatId"),
    name: getStringFormValue(formData, "name"),
    exportTarget: getStringFormValue(formData, "exportTarget"),
    deliveryFormat: getStringFormValue(formData, "deliveryFormat"),
    profile: getStringFormValue(formData, "profile"),
    description: getStringFormValue(formData, "description"),
    aliasProfile: getStringFormValue(formData, "aliasProfile"),
    keySeparator: getStringFormValue(formData, "keySeparator") || undefined,
    includeTestSubmissions: getBooleanFormValue(
      formData,
      "includeTestSubmissions",
    ),
  };

  const validated = updateExportFormatSchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const settingsValidationError = validateSettingsFields(validated.data);
  if (settingsValidationError) {
    return ServerActionState.fromZodError(settingsValidationError, rawData);
  }

  const api = new EndatixApi(session?.accessToken);
  const catalogsResult = await loadExportCatalogs(api);
  if (Result.isError(catalogsResult)) {
    return {
      isSuccess: false,
      message: catalogsResult.message,
      data: rawData,
    };
  }

  const catalogValidationError = validateCatalogMembership(
    validated.data,
    catalogsResult.value.capabilities,
    catalogsResult.value.namingConventions,
  );
  if (catalogValidationError) {
    return ServerActionState.fromZodError(catalogValidationError, rawData);
  }

  const body: UpdateExportFormatRequestBody = {
    name: validated.data.name,
    description: validated.data.description ?? null,
    settings: buildExportFormatSettingsInput(
      validated.data.exportTarget,
      validated.data.profile,
      {
        aliasProfile: validated.data.aliasProfile,
        keySeparator: validated.data.keySeparator,
        includeTestSubmissions: validated.data.includeTestSubmissions,
      },
    ),
  };

  const apiResult = await api.reporting.exportFormats.update(
    validated.data.exportFormatId,
    body,
  );

  if (ApiResult.isSuccess(apiResult)) {
    revalidatePath(EXPORT_FORMATS_PATH);
    return { isSuccess: true, message: "Export format updated." };
  }

  const result = toResult(apiResult, {
    fallbackMessage: "Failed to update export format.",
    logMessage: "Failed to update export format.",
    loggerName: LOGGER_NAME,
  });

  return {
    isSuccess: false,
    message: Result.isError(result)
      ? result.message
      : "Failed to update export format.",
    data: rawData,
  };
}

export async function deleteExportFormatAction(
  exportFormatId: string,
): Promise<ExportFormatActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageSettings);

  const disabled = await requireReportingExportSettings();
  if (disabled) {
    return disabled;
  }

  const validated = deleteExportFormatSchema.safeParse({ exportFormatId });
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, { exportFormatId });
  }

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.reporting.exportFormats.delete(
    validated.data.exportFormatId,
  );

  if (ApiResult.isSuccess(apiResult)) {
    revalidatePath(EXPORT_FORMATS_PATH);
    return { isSuccess: true, message: "Export format deleted." };
  }

  const result = toResult(apiResult, {
    fallbackMessage: "Failed to delete export format.",
    logMessage: "Failed to delete export format.",
    loggerName: LOGGER_NAME,
  });

  return {
    isSuccess: false,
    message: Result.isError(result)
      ? result.message
      : "Failed to delete export format.",
    data: { exportFormatId },
  };
}

export async function upsertTenantDefaultExportMappingAction(
  exportFormatId: string,
): Promise<ExportFormatActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageSettings);

  const disabled = await requireReportingExportSettings();
  if (disabled) {
    return disabled;
  }

  const validated = upsertDefaultMappingSchema.safeParse({ exportFormatId });
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, { exportFormatId });
  }

  const api = new EndatixApi(session?.accessToken);
  const formatsApiResult = await api.reporting.exportFormats.list();
  const formatsResult = toResult(formatsApiResult, {
    fallbackMessage: "Failed to load export formats.",
    logMessage: "Failed to load export formats for default mapping validation.",
    loggerName: LOGGER_NAME,
  });

  if (Result.isError(formatsResult)) {
    return {
      isSuccess: false,
      message: formatsResult.message,
      data: { exportFormatId },
    };
  }

  const selectedFormat = formatsResult.value.find(
    (format) => format.id === validated.data.exportFormatId,
  );
  if (selectedFormat?.exportTarget !== "Submissions") {
    return {
      isSuccess: false,
      message: "Default export format must target submissions.",
      data: { exportFormatId },
    };
  }

  const apiResult = await api.reporting.exportMappings.upsert({
    exportFormatId: validated.data.exportFormatId,
    isDefault: true,
  });

  if (ApiResult.isSuccess(apiResult)) {
    revalidatePath(EXPORT_FORMATS_PATH);
    return { isSuccess: true, message: "Default export format updated." };
  }

  const result = toResult(apiResult, {
    fallbackMessage: "Failed to update default export format.",
    logMessage: "Failed to update tenant default export mapping.",
    loggerName: LOGGER_NAME,
  });

  return {
    isSuccess: false,
    message: Result.isError(result)
      ? result.message
      : "Failed to update default export format.",
    data: { exportFormatId },
  };
}

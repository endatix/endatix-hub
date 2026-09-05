"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
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
import {
  DELIVERY_VALUES,
  PROFILE_VALUES,
  TARGET_VALUES,
} from "@/lib/endatix-api/reporting/normalize-export-enums";
import { normalizeExportNamingConventions } from "@/lib/endatix-api/reporting/normalize-export-naming-conventions";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import {
  getBooleanFormValue,
  getStringFormValue,
} from "@/lib/utils/form-data-utils";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

function enumSchema<T extends string>(values: readonly T[]) {
  return z.enum(values as [T, ...T[]]);
}

const exportTargetSchema = enumSchema(TARGET_VALUES);
const deliveryFormatSchema = enumSchema(DELIVERY_VALUES);
const profileSchema = enumSchema(PROFILE_VALUES);
const exportFormatIdSchema = createEndatixIdSchema("exportFormatId");
const exportFormatIdBodySchema = z.object({
  exportFormatId: exportFormatIdSchema,
});

const exportFormatSettingsObjectSchema = z.object({
  exportTarget: exportTargetSchema,
  deliveryFormat: deliveryFormatSchema,
  profile: profileSchema,
  aliasProfile: z.string().trim().min(1),
  keySeparator: z.string().trim().min(1),
  includeTestSubmissions: z.boolean().optional(),
});

function refineSettingsFields(
  data: z.infer<typeof exportFormatSettingsObjectSchema>,
  ctx: z.RefinementCtx,
) {
  const visibility = getExportFormatSettingsFieldVisibility(data.exportTarget);
  if (!visibility.includeTestSubmissions && data.includeTestSubmissions) {
    ctx.addIssue({
      code: "custom",
      path: ["includeTestSubmissions"],
      message: "Include test submissions applies only to submission exports.",
    });
  }
}

const nameFieldsSchema = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
};

const createExportFormatSchema = exportFormatSettingsObjectSchema
  .extend(nameFieldsSchema)
  .superRefine(refineSettingsFields);

const updateExportFormatSchema = exportFormatSettingsObjectSchema
  .extend({
    exportFormatId: exportFormatIdSchema,
    ...nameFieldsSchema,
  })
  .superRefine(refineSettingsFields);

const EXPORT_FORMATS_PATH = "/settings/organization/export-formats";
const LOGGER_NAME = "export.manage-export-formats";
const REPORTING_EXPORT_DISABLED_MESSAGE =
  "Reporting export is not enabled for this environment.";

type SettingsFields = z.infer<typeof exportFormatSettingsObjectSchema>;

/** Posted form values echoed back for `defaultValues` — matches form field unions. */
export type PostedExportFormatFields = {
  exportFormatId?: string;
  name?: string;
  description?: string;
  exportTarget?: ExportTarget | "";
  deliveryFormat?: ExportDeliveryFormat | "";
  profile?: ExportProfile | "";
  aliasProfile?: string;
  keySeparator?: string;
  includeTestSubmissions?: boolean;
};

export type ExportFormatActionState =
  ServerActionState<PostedExportFormatFields>;

function catalogSelectionSchema(
  capabilities: ReadonlyArray<ExportCapabilityDto>,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto>,
) {
  return z
    .object({
      exportTarget: exportTargetSchema,
      deliveryFormat: deliveryFormatSchema,
      profile: profileSchema,
      aliasProfile: z.string(),
    })
    .superRefine((selection, ctx) => {
      if (
        !getExportCapabilityForSelection(
          selection.exportTarget,
          selection.deliveryFormat,
          selection.profile,
          capabilities,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["exportTarget"],
          message:
            "Selected export type is not supported by the available capabilities.",
        });
      }

      if (
        !getColumnAliasNamingConvention(
          selection.aliasProfile,
          namingConventions,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["aliasProfile"],
          message: "Selected column naming is not supported.",
        });
      }
    });
}

function readExportFormatForm(formData: FormData): PostedExportFormatFields {
  return {
    name: getStringFormValue(formData, "name"),
    exportTarget: getStringFormValue(formData, "exportTarget") as
      | ExportTarget
      | "",
    deliveryFormat: getStringFormValue(formData, "deliveryFormat") as
      | ExportDeliveryFormat
      | "",
    profile: getStringFormValue(formData, "profile") as ExportProfile | "",
    description: getStringFormValue(formData, "description"),
    aliasProfile: getStringFormValue(formData, "aliasProfile"),
    keySeparator: getStringFormValue(formData, "keySeparator") || undefined,
    includeTestSubmissions: getBooleanFormValue(
      formData,
      "includeTestSubmissions",
    ),
  };
}

function settingsInput(data: SettingsFields) {
  return buildExportFormatSettingsInput(data.exportTarget, data.profile, {
    aliasProfile: data.aliasProfile,
    keySeparator: data.keySeparator,
    includeTestSubmissions: data.includeTestSubmissions,
  });
}

async function requireExportFormatsClient(): Promise<ResultType<EndatixApi>> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageSettings);

  const reportingExportEnabled = await reportingExportFlag();
  if (!reportingExportEnabled) {
    return Result.error(REPORTING_EXPORT_DISABLED_MESSAGE);
  }

  return Result.success(new EndatixApi(session?.accessToken));
}

async function loadExportCatalogs(api: EndatixApi): Promise<
  ResultType<{
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

function finishWrite(
  result: ResultType<unknown>,
  successMessage: string,
  rawData?: PostedExportFormatFields,
): ExportFormatActionState {
  if (Result.isSuccess(result)) {
    revalidatePath(EXPORT_FORMATS_PATH);
    return { isSuccess: true, message: successMessage };
  }

  return ServerActionState.fromFailure(result, rawData);
}

async function validateAgainstCatalogs(
  api: EndatixApi,
  selection: SettingsFields,
  rawData: PostedExportFormatFields,
): Promise<ExportFormatActionState | null> {
  const catalogsResult = await loadExportCatalogs(api);
  if (Result.isError(catalogsResult)) {
    return ServerActionState.fromFailure(catalogsResult, rawData);
  }

  const catalogParsed = catalogSelectionSchema(
    catalogsResult.value.capabilities,
    catalogsResult.value.namingConventions,
  ).safeParse(selection);
  if (!catalogParsed.success) {
    return ServerActionState.fromZodError(catalogParsed.error, rawData);
  }

  return null;
}

export async function createExportFormatAction(
  _prevState: ExportFormatActionState,
  formData: FormData,
): Promise<ExportFormatActionState> {
  const access = await requireExportFormatsClient();
  if (Result.isError(access)) {
    return ServerActionState.fromFailure(access);
  }

  const rawData = readExportFormatForm(formData);
  const validated = createExportFormatSchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const catalogError = await validateAgainstCatalogs(
    access.value,
    validated.data,
    rawData,
  );
  if (catalogError) {
    return catalogError;
  }

  const body: CreateExportFormatRequestBody = {
    name: validated.data.name,
    exportTarget: validated.data.exportTarget,
    deliveryFormat: validated.data.deliveryFormat,
    profile: validated.data.profile,
    description: validated.data.description,
    settings: settingsInput(validated.data),
  };

  return finishWrite(
    toResult(await access.value.reporting.exportFormats.create(body), {
      fallbackMessage: "Failed to create export format.",
      logMessage: "Failed to create export format.",
      loggerName: LOGGER_NAME,
    }),
    "Export format created.",
    rawData,
  );
}

export async function updateExportFormatAction(
  _prevState: ExportFormatActionState,
  formData: FormData,
): Promise<ExportFormatActionState> {
  const access = await requireExportFormatsClient();
  if (Result.isError(access)) {
    return ServerActionState.fromFailure(access);
  }

  const rawData = {
    exportFormatId: getStringFormValue(formData, "exportFormatId"),
    ...readExportFormatForm(formData),
  };
  const validated = updateExportFormatSchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const catalogError = await validateAgainstCatalogs(
    access.value,
    validated.data,
    rawData,
  );
  if (catalogError) {
    return catalogError;
  }

  const body: UpdateExportFormatRequestBody = {
    name: validated.data.name,
    description: validated.data.description ?? null,
    settings: settingsInput(validated.data),
  };

  return finishWrite(
    toResult(
      await access.value.reporting.exportFormats.update(
        validated.data.exportFormatId,
        body,
      ),
      {
        fallbackMessage: "Failed to update export format.",
        logMessage: "Failed to update export format.",
        loggerName: LOGGER_NAME,
      },
    ),
    "Export format updated.",
    rawData,
  );
}

export async function deleteExportFormatAction(
  exportFormatId: string,
): Promise<ExportFormatActionState> {
  const access = await requireExportFormatsClient();
  if (Result.isError(access)) {
    return ServerActionState.fromFailure(access);
  }

  const rawData = { exportFormatId };
  const validated = exportFormatIdBodySchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  return finishWrite(
    toResult(
      await access.value.reporting.exportFormats.delete(
        validated.data.exportFormatId,
      ),
      {
        fallbackMessage: "Failed to delete export format.",
        logMessage: "Failed to delete export format.",
        loggerName: LOGGER_NAME,
      },
    ),
    "Export format deleted.",
    rawData,
  );
}

export async function upsertTenantDefaultExportMappingAction(
  exportFormatId: string,
): Promise<ExportFormatActionState> {
  const access = await requireExportFormatsClient();
  if (Result.isError(access)) {
    return ServerActionState.fromFailure(access);
  }

  const rawData = { exportFormatId };
  const validated = exportFormatIdBodySchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const formatsResult = toResult(
    await access.value.reporting.exportFormats.list(),
    {
      fallbackMessage: "Failed to load export formats.",
      logMessage:
        "Failed to load export formats for default mapping validation.",
      loggerName: LOGGER_NAME,
    },
  );
  if (Result.isError(formatsResult)) {
    return ServerActionState.fromFailure(formatsResult, rawData);
  }

  const selectedFormat = formatsResult.value.find(
    (format) => format.id === validated.data.exportFormatId,
  );
  if (selectedFormat?.exportTarget !== "Submissions") {
    return ServerActionState.fromFailure(
      "Default export format must target submissions.",
      rawData,
    );
  }

  return finishWrite(
    toResult(
      await access.value.reporting.exportMappings.upsert({
        exportFormatId: validated.data.exportFormatId,
        isDefault: true,
      }),
      {
        fallbackMessage: "Failed to update default export format.",
        logMessage: "Failed to update tenant default export mapping.",
        loggerName: LOGGER_NAME,
      },
    ),
    "Default export format updated.",
    rawData,
  );
}

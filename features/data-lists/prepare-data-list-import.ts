import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { guardEnsureLocalesCount } from "@/features/data-lists/import-payload-guards";
import { EndatixApi } from "@/lib/endatix-api";
import { normalizeCultureCodes } from "@/lib/localization";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";

export type PreparedDataListImport = {
  dataListId: string;
  ensureLocales: string[];
  api: EndatixApi;
};

export type PrepareDataListImportInput = {
  dataListId: string;
  ensureLocales?: string[];
  /** Format/payload guard run before getById (fail fast). */
  payloadGuard: Result<void>;
  loadDetailsLogMessage: string;
  loggerName: string;
};

/**
 * Shared auth + id + ensureLocales + catalog-cap prep for replace/CSV import actions.
 * Runs payload/locale guards before getById, then re-checks locales against the catalog.
 */
export async function prepareDataListImport(
  input: PrepareDataListImportInput,
): Promise<Result<PreparedDataListImport>> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(input.dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const localesResult = normalizeCultureCodes(input.ensureLocales ?? []);
  if (!localesResult.ok) {
    return Result.error(
      `'${localesResult.invalid}' is not a valid culture code.`,
    );
  }

  if (Result.isError(input.payloadGuard)) {
    return input.payloadGuard;
  }

  const earlyLocalesGuard = guardEnsureLocalesCount(localesResult.value, []);
  if (Result.isError(earlyLocalesGuard)) {
    return earlyLocalesGuard;
  }

  const api = new EndatixApi(session?.accessToken);
  const detailsResult = toResult(await api.dataLists.getById(idResult.value), {
    fallbackMessage: "Failed to load data list",
    logMessage: input.loadDetailsLogMessage,
    loggerName: input.loggerName,
  });
  if (Result.isError(detailsResult)) {
    return detailsResult;
  }

  const localesGuard = guardEnsureLocalesCount(
    localesResult.value,
    detailsResult.value.availableLocales ?? [],
  );
  if (Result.isError(localesGuard)) {
    return localesGuard;
  }

  return Result.success({
    dataListId: idResult.value,
    ensureLocales: localesResult.value,
    api,
  });
}

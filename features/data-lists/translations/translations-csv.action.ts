"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { guardTranslationsCsvPayload } from "@/features/data-lists/import-payload-guards";
import { prepareDataListImport } from "@/features/data-lists/prepare-data-list-import";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { tryNormalizeCultureCode } from "@/lib/localization";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { revalidatePath } from "next/cache";

export type UploadTranslationsCsvResult = Result<DataListDetails>;

export type DataListLocaleMutationResult = Result<DataListDetails>;

export type UploadTranslationsCsvInput = {
  dataListId: string;
  csv: string;
  ensureLocales?: string[];
};

function normalizeLocaleInput(locale: string): Result<string> {
  const normalized = tryNormalizeCultureCode(locale);
  if (normalized === null) {
    return Result.error(
      `'${locale.trim() || locale}' is not a valid culture code.`,
    );
  }
  return Result.success(normalized);
}

export async function uploadTranslationsCsvAction(
  input: UploadTranslationsCsvInput,
): Promise<UploadTranslationsCsvResult> {
  const prepared = await prepareDataListImport({
    dataListId: input.dataListId,
    ensureLocales: input.ensureLocales,
    payloadGuard: guardTranslationsCsvPayload(input.csv),
    loadDetailsLogMessage:
      "Failed to load data list before translations CSV upload",
    loggerName: "data-lists.translationsCsv",
  });
  if (Result.isError(prepared)) {
    return prepared;
  }

  const result = toResult(
    await prepared.value.api.dataLists.uploadTranslationsCsv(
      prepared.value.dataListId,
      input.csv,
      { ensureLocales: prepared.value.ensureLocales },
    ),
    {
      fallbackMessage: "Failed to upload translations CSV",
      logMessage: "Failed to upload translations CSV",
      loggerName: "data-lists.translationsCsv",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${prepared.value.dataListId}`);
  }

  return result;
}

export async function addDataListLocaleAction(
  dataListId: string,
  locale: string,
): Promise<DataListLocaleMutationResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const localeResult = normalizeLocaleInput(locale);
  if (Result.isError(localeResult)) {
    return localeResult;
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.addLocale(idResult.value, localeResult.value),
    {
      fallbackMessage: "Failed to add locale",
      logMessage: "Failed to add locale",
      loggerName: "data-lists.locales",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${idResult.value}`);
  }

  return result;
}

export async function setDataListDefaultLocaleAction(
  dataListId: string,
  defaultLocale: string,
): Promise<DataListLocaleMutationResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const localeResult = normalizeLocaleInput(defaultLocale);
  if (Result.isError(localeResult)) {
    return localeResult;
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.setDefaultLocale(idResult.value, localeResult.value),
    {
      fallbackMessage: "Failed to set default locale",
      logMessage: "Failed to set default locale",
      loggerName: "data-lists.locales",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${idResult.value}`);
  }

  return result;
}

"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import {
  normalizeCultureCodes,
  tryNormalizeCultureCode,
} from "@/lib/localization";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
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
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const localesResult = normalizeCultureCodes(input.ensureLocales ?? []);
  if (!localesResult.ok) {
    return Result.error(
      `'${localesResult.invalid}' is not a valid culture code.`,
    );
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.uploadTranslationsCsv(input.dataListId, input.csv, {
      ensureLocales: localesResult.value,
    }),
    {
      fallbackMessage: "Failed to upload translations CSV",
      logMessage: "Failed to upload translations CSV",
      loggerName: "data-lists.translationsCsv",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${input.dataListId}`);
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

  const localeResult = normalizeLocaleInput(locale);
  if (Result.isError(localeResult)) {
    return localeResult;
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.addLocale(dataListId, localeResult.value),
    {
      fallbackMessage: "Failed to add locale",
      logMessage: "Failed to add locale",
      loggerName: "data-lists.locales",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${dataListId}`);
  }

  return result;
}

export async function removeDataListLocaleAction(
  dataListId: string,
  locale: string,
): Promise<DataListLocaleMutationResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const localeResult = normalizeLocaleInput(locale);
  if (Result.isError(localeResult)) {
    return localeResult;
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.removeLocale(dataListId, localeResult.value),
    {
      fallbackMessage: "Failed to remove locale",
      logMessage: "Failed to remove locale",
      loggerName: "data-lists.locales",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${dataListId}`);
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

  const localeResult = normalizeLocaleInput(defaultLocale);
  if (Result.isError(localeResult)) {
    return localeResult;
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.setDefaultLocale(dataListId, localeResult.value),
    {
      fallbackMessage: "Failed to set default locale",
      logMessage: "Failed to set default locale",
      loggerName: "data-lists.locales",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${dataListId}`);
  }

  return result;
}

"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";

export type DownloadTranslationsCsvResult = Result<{
  csv: string;
  fileName: string;
}>;

export type UploadTranslationsCsvResult = Result<DataListDetails>;

export type DataListLocaleMutationResult = Result<DataListDetails>;

export async function downloadTranslationsCsvAction(
  dataListId: string,
): Promise<DownloadTranslationsCsvResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  return toResult(await api.dataLists.downloadTranslationsCsv(dataListId), {
    fallbackMessage: "Failed to download translations CSV",
    logMessage: "Failed to download translations CSV",
    loggerName: "data-lists.translationsCsv",
  });
}

export type UploadTranslationsCsvInput = {
  dataListId: string;
  csv: string;
  ensureLocales?: string[];
};

export async function uploadTranslationsCsvAction(
  input: UploadTranslationsCsvInput,
): Promise<UploadTranslationsCsvResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const ensureLocales = input.ensureLocales ?? [];
  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.uploadTranslationsCsv(input.dataListId, input.csv, {
      ensureLocales,
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

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.dataLists.addLocale(dataListId, locale), {
    fallbackMessage: "Failed to add locale",
    logMessage: "Failed to add locale",
    loggerName: "data-lists.locales",
  });

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

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.removeLocale(dataListId, locale),
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

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.setDefaultLocale(dataListId, defaultLocale),
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

import { createEndatixPublicApi } from "@/lib/endatix-api/public";
import { getBrowserEndatixConfig } from "@/features/config/client-endatix-config";
import type { DataListChoiceItem } from "@/lib/endatix-api/public/data-lists/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { withFormAccessJwtRetry } from "../utils/with-form-access-jwt-retry";

export type ResolveDisplayValuesOptions = {
  locale?: string;
  includeLocales?: string[];
};

const labelsByValueCache = new Map<string, Record<string, string>>();

function cacheKey(formId: string, dataListId: string, value: string): string {
  return `${formId}|${dataListId}|${value}`;
}

/**
 * True when cache has no entry, or when any requested includeLocale is absent
 * from the stored label map (partial coverage must re-fetch and merge).
 */
function needsDisplayValuesFetch(
  labels: Record<string, string> | undefined,
  includeLocales: string[] | undefined,
): boolean {
  if (!labels) {
    return true;
  }
  if (!includeLocales || includeLocales.length === 0) {
    return false;
  }
  return includeLocales.some((locale) => !(locale in labels));
}

/** Test-only: clears the display-values labels cache. */
export function clearDataListDisplayValuesCacheForTests(): void {
  labelsByValueCache.clear();
}

/**
 * Ensures choice labels are cached for the given values and returns the full
 * locale map per value. SurveyJS {@link LocalizableString} can then switch
 * locales without another fetch or flattening to a single string.
 */
export async function resolveDataListDisplayValues(
  deps: ExtensionRuntimeDeps,
  dataListId: string,
  values: string[],
  options: ResolveDisplayValuesOptions = {},
): Promise<ApiResult<Map<string, Record<string, string>>>> {
  const runtime = resolveFormRuntimeState(deps.getRuntimeState());
  if (!runtime || values.length === 0) {
    return ApiResult.authError("Form runtime is not available.");
  }

  const distinctValues = [
    ...new Set(values.map(String).filter((value) => value.length > 0)),
  ];

  const missingValues = distinctValues.filter((value) =>
    needsDisplayValuesFetch(
      labelsByValueCache.get(cacheKey(runtime.formId, dataListId, value)),
      options.includeLocales,
    ),
  );

  if (missingValues.length > 0) {
    const api = createEndatixPublicApi({
      baseUrl: getBrowserEndatixConfig().apiBaseUrl,
    }).dataLists;
    const response = await withFormAccessJwtRetry(runtime, (jwt) =>
      api.getDisplayValues({
        formId: runtime.formId,
        dataListId,
        formAccessJwt: jwt,
        values: missingValues,
        locale: options.locale,
        includeLocales: options.includeLocales,
      }),
    );

    if (!response.success) {
      return response;
    }

    for (const item of response.data) {
      rememberLabels(runtime.formId, dataListId, item);
    }
  }

  return ApiResult.success(
    new Map(
      distinctValues.map((value) => {
        const labels = labelsByValueCache.get(
          cacheKey(runtime.formId, dataListId, value),
        );
        return [value, labels ? { ...labels } : { default: value }] as const;
      }),
    ),
  );
}

function rememberLabels(
  formId: string,
  dataListId: string,
  item: DataListChoiceItem,
): void {
  const key = cacheKey(formId, dataListId, item.value);
  const existing = labelsByValueCache.get(key);
  labelsByValueCache.set(
    key,
    existing ? { ...existing, ...item.labels } : { ...item.labels },
  );
}

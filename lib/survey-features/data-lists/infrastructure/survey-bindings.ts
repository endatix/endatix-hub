import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { TelemetryLogger } from "@/features/telemetry";
import {
  ChoicesLazyLoadEvent,
  GetChoiceDisplayValueEvent,
  Model,
  SurveyModel,
} from "survey-core";
import {
  notifyChoicesLazyLoadCompleted,
  shouldSuppressChoicesLazyLoad,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import {
  getQuestionSearchMode,
  searchDataListChoices,
} from "../use-cases/search-data-lists";
import { resolveDataListDisplayValues } from "../use-cases/resolve-data-list-display-values";
import { getDataListIdFromQuestion } from "./data-list-survey-integration";
import { completeLazyLoadChoiceDisplayValues } from "./apply-multilingual-choice-display-values";
import {
  dispatchPropertyGridChoiceDisplayValues,
  dispatchPropertyGridChoicesLazyLoad,
  type PropertyGridLazyChoiceContext,
} from "./property-grid-lazy-choice-registry";
import { registerDataListGlobals } from "./registry";
import { resolveSurveyLocalesForDataList } from "./resolve-survey-locales-for-data-list";
import { Result, toResult } from "@/lib/result";

const DATA_LIST_HANDLERS_ATTACHED_KEY = "__endatixDataListHandlersAttached";
const LOGGER_NAME = "data-lists.surveyBindings";

export type BindDataListsToSurveyOptions = {
  deps: ExtensionRuntimeDeps;
  getDesignerSurvey?: () => SurveyModel | null;
};

type DataListLocaleQuery = {
  locale?: string;
  includeLocales?: string[];
};

function identityLabelMap(
  values: string[],
): Map<string, Record<string, string>> {
  return new Map(values.map((value) => [value, { default: value }] as const));
}

/**
 * Resolves labels for a batch of choice values. On API failure, falls back to
 * identity labels so lazy-load display completion can still finish.
 * Telemetry for unexpected failures is handled by {@link toResult}.
 */
async function fetchDataListLabelsOrIdentity(
  deps: ExtensionRuntimeDeps,
  dataListId: string,
  values: string[],
  locales: DataListLocaleQuery,
  failureMessage: string,
): Promise<Map<string, Record<string, string>>> {
  try {
    const result = toResult(
      await resolveDataListDisplayValues(deps, dataListId, values, locales),
      {
        fallbackMessage: failureMessage,
        logMessage: failureMessage,
        loggerName: LOGGER_NAME,
      },
    );

    if (Result.isError(result)) {
      return identityLabelMap(values);
    }

    return result.value;
  } catch (error) {
    TelemetryLogger.error(failureMessage, error, {}, LOGGER_NAME);
    return identityLabelMap(values);
  }
}

function resolveBindOptions(
  depsOrOptions: ExtensionRuntimeDeps | BindDataListsToSurveyOptions,
): BindDataListsToSurveyOptions {
  if ("deps" in depsOrOptions) {
    return depsOrOptions;
  }

  return { deps: depsOrOptions };
}

function buildPropertyGridContext(
  model: Model,
  getDesignerSurvey?: () => SurveyModel | null,
): PropertyGridLazyChoiceContext | null {
  const designerSurvey = getDesignerSurvey?.() ?? null;
  if (!designerSurvey || model.editingObj == null) {
    return null;
  }

  return {
    designerSurvey,
    propertyGridSurvey: model,
    editingObj: model.editingObj,
  };
}

export function bindDataListsToSurvey(
  model: Model,
  depsOrOptions: ExtensionRuntimeDeps | BindDataListsToSurveyOptions,
): () => void {
  registerDataListGlobals();

  const { deps, getDesignerSurvey } = resolveBindOptions(depsOrOptions);

  const modelWithFlags = model as Model & Record<string, unknown>;
  if (modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }
  modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY] = true;

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    const filter = options.filter ?? "";
    if (shouldSuppressChoicesLazyLoad(options.question, filter)) {
      options.setItems([], 0);
      return;
    }

    const propertyGridCtx = buildPropertyGridContext(model, getDesignerSurvey);
    if (propertyGridCtx) {
      const providerResult = await dispatchPropertyGridChoicesLazyLoad(
        propertyGridCtx,
        options.question.name,
        {
          filter: options.filter,
          skip: options.skip,
          take: options.take,
        },
        deps,
      );

      if (providerResult) {
        options.setItems(providerResult.items, providerResult.total);
        notifyChoicesLazyLoadCompleted(
          options.question,
          filter,
          providerResult.items.length,
          true,
        );
        return;
      }
    }

    const runtime = resolveFormRuntimeState(deps.getRuntimeState());
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!runtime || !dataListId) {
      options.setItems([], 0);
      return;
    }

    const { locale, includeLocales } = resolveSurveyLocalesForDataList(
      model,
      options.question,
    );

    const response = await searchDataListChoices(deps, dataListId, {
      filter: options.filter,
      searchMode: getQuestionSearchMode(options.question),
      locale,
      includeLocales,
      skip: options.skip,
      take: options.take,
    });

    if (!response.success) {
      console.error("Failed to lazy-load data list choices.", response.error);
      options.setItems([], 0);
      notifyChoicesLazyLoadCompleted(options.question, filter, 0, false);
      return;
    }

    // SurveyJS accepts nested locale maps on text at runtime; typings only allow string.
    options.setItems(
      response.data.items as Array<{ value: string; text?: string }>,
      response.data.total,
    );
    notifyChoicesLazyLoadCompleted(
      options.question,
      filter,
      response.data.items.length,
      true,
    );
  };

  const onGetChoiceDisplayValue = async (
    _: Model,
    options: GetChoiceDisplayValueEvent,
  ) => {
    const propertyGridCtx = buildPropertyGridContext(model, getDesignerSurvey);
    if (propertyGridCtx) {
      const labels = await dispatchPropertyGridChoiceDisplayValues(
        propertyGridCtx,
        options.question.name,
        options.values.map(String),
        deps,
      );

      if (labels) {
        options.setItems(labels);
        return;
      }
    }

    const runtime = resolveFormRuntimeState(deps.getRuntimeState());
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!runtime || !dataListId || options.values.length === 0) {
      return;
    }

    const values = options.values.map(String);
    const locales = resolveSurveyLocalesForDataList(model, options.question);

    const result = toResult(
      await resolveDataListDisplayValues(deps, dataListId, values, locales),
      {
        fallbackMessage: "Failed to resolve data list display values.",
        logMessage: "Failed to resolve data list display values.",
        loggerName: LOGGER_NAME,
      },
    );

    if (Result.isError(result)) {
      options.setItems(values);
      return;
    }

    await completeLazyLoadChoiceDisplayValues({
      question: options.question,
      requestedValues: values,
      labelsByValue: result.value,
      setItems: options.setItems,
      activeLocale: locales.locale,
      fetchLabels: (missingValues) =>
        fetchDataListLabelsOrIdentity(
          deps,
          dataListId,
          missingValues,
          locales,
          "Failed to resolve remaining data list display values.",
        ),
    });
  };

  model.onChoicesLazyLoad.add(onChoicesLazyLoad);
  model.onGetChoiceDisplayValue.add(onGetChoiceDisplayValue);

  return () => {
    model.onChoicesLazyLoad.remove(onChoicesLazyLoad);
    model.onGetChoiceDisplayValue.remove(onGetChoiceDisplayValue);
    modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY] = false;
  };
}

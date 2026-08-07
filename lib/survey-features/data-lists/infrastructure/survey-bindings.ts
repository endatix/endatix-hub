import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
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
import {
  dispatchPropertyGridChoiceDisplayValues,
  dispatchPropertyGridChoicesLazyLoad,
  type PropertyGridLazyChoiceContext,
} from "./property-grid-lazy-choice-registry";
import { registerDataListGlobals } from "./registry";

const DATA_LIST_HANDLERS_ATTACHED_KEY = "__endatixDataListHandlersAttached";

export type BindDataListsToSurveyOptions = {
  deps: ExtensionRuntimeDeps;
  getDesignerSurvey?: () => SurveyModel | null;
};

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

    const response = await searchDataListChoices(deps, dataListId, {
      filter: options.filter,
      searchMode: getQuestionSearchMode(options.question),
      locale: options.question.getLocale() || undefined,
      skip: options.skip,
      take: options.take,
    });

    if (!response.success) {
      console.error("Failed to lazy-load data list choices.", response.error);
      options.setItems([], 0);
      notifyChoicesLazyLoadCompleted(options.question, filter, 0, false);
      return;
    }

    options.setItems(response.data.items, response.data.total);
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

    const response = await resolveDataListDisplayValues(
      deps,
      dataListId,
      options.values.map(String),
    );

    if (!response.success) {
      console.error("Failed to resolve data list display values.", {
        type: response.error.type,
        message: response.error.message,
        errorCode: response.error.errorCode,
      });
      options.setItems(options.values.map(String));
      return;
    }

    options.setItems(
      options.values.map(
        (value) => response.data.get(String(value)) ?? String(value),
      ),
    );
  };

  model.onChoicesLazyLoad.add(onChoicesLazyLoad);
  model.onGetChoiceDisplayValue.add(onGetChoiceDisplayValue);

  return () => {
    model.onChoicesLazyLoad.remove(onChoicesLazyLoad);
    model.onGetChoiceDisplayValue.remove(onGetChoiceDisplayValue);
    modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY] = false;
  };
}

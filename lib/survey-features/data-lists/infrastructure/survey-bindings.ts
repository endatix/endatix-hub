import { createPublicDataListsClient } from "@/lib/endatix-public-api";
import { ChoicesLazyLoadEvent, GetChoiceDisplayValueEvent, Model } from "survey-core";
import {
  DATA_LIST_PROPERTY_NAME,
  RUNTIME_DATA_LIST_CONTEXT_KEY,
} from "../constants";
import { registerDataListGlobals } from "./registry";
import { DataListRuntimeContext } from "../runtime-context";

const DATA_LIST_HANDLERS_ATTACHED_KEY = "__endatixDataListHandlersAttached";

function getRuntimeContext(model: Model): DataListRuntimeContext | null {
  const context = (model as Model & Record<string, unknown>)[
    RUNTIME_DATA_LIST_CONTEXT_KEY
  ];
  if (!context || typeof context !== "object") {
    return null;
  }

  return context as DataListRuntimeContext;
}

function getDataListIdFromQuestion(
  question: ChoicesLazyLoadEvent["question"] | GetChoiceDisplayValueEvent["question"],
): string | null {
  const value = question?.getPropertyValue?.(DATA_LIST_PROPERTY_NAME);
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function bindDataListsToSurvey(model: Model): () => void {
  // Ensure custom property metadata is registered before reading question properties at runtime.
  registerDataListGlobals();

  const modelWithFlags = model as Model & Record<string, unknown>;
  if (modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }
  modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY] = true;

  const api = createPublicDataListsClient();

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    const context = getRuntimeContext(model);
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!context || !dataListId) {
      options.setItems([], 0);
      return;
    }

    const response = await api.search({
      formId: context.formId,
      dataListId,
      query: options.filter,
      skip: options.skip,
      take: options.take,
      token: context.token,
      tokenType: context.tokenType,
    });

    if (!response.success) {
      console.error("Failed to lazy-load data list choices.", response.error);
      options.setItems([], 0);
      return;
    }

    options.setItems(
      response.data.items.map((item) => ({ value: item.value, text: item.label })),
      response.data.total,
    );
  };

  const onGetChoiceDisplayValue = async (
    _: Model,
    options: GetChoiceDisplayValueEvent,
  ) => {
    const context = getRuntimeContext(model);
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!context || !dataListId || options.values.length === 0) {
      return;
    }

    const response = await api.getDisplayValues({
      formId: context.formId,
      dataListId,
      values: options.values.map((value) => String(value)),
      token: context.token,
      tokenType: context.tokenType,
    });

    if (!response.success) {
      console.error("Failed to resolve data list display values.", response.error);
      options.setItems(options.values.map((value) => String(value)));
      return;
    }

    const valueMap = new Map(
      response.data.map((item) => [item.value, item.label] as const),
    );
    options.setItems(
      options.values.map((value) => valueMap.get(String(value)) ?? String(value)),
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

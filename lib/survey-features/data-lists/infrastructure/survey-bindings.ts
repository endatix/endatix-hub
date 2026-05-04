import { createEndatixPublicApi } from "@/lib/endatix-api/public";
import { ApiErrorType, ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  ensureRuntimeFormAccessJwt,
  invalidateRuntimeFormAccessJwt,
} from "@/lib/form-runtime/form-access-jwt-orchestrator";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import {
  ChoicesLazyLoadEvent,
  GetChoiceDisplayValueEvent,
  Model,
} from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import { registerDataListGlobals } from "./registry";

const DATA_LIST_HANDLERS_ATTACHED_KEY = "__endatixDataListHandlersAttached";

function getDataListIdFromQuestion(
  question:
    | ChoicesLazyLoadEvent["question"]
    | GetChoiceDisplayValueEvent["question"],
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

export function bindDataListsToSurvey(
  model: Model,
  deps: ExtensionRuntimeDeps,
): () => void {
  registerDataListGlobals();

  const modelWithFlags = model as Model & Record<string, unknown>;
  if (modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }
  modelWithFlags[DATA_LIST_HANDLERS_ATTACHED_KEY] = true;

  const api = createEndatixPublicApi().dataLists;

  async function withJwtRetry<T>(
    runtimeState: ReturnType<ExtensionRuntimeDeps["getRuntimeState"]>,
    call: (jwt: string) => Promise<ApiResult<T>>,
  ): Promise<ApiResult<T>> {
    let jwt = await ensureRuntimeFormAccessJwt(runtimeState);
    if (!jwt) {
      return ApiResult.authError<T>("Could not obtain form access token.");
    }

    let response = await call(jwt);
    if (!response.success && response.error.type === ApiErrorType.AuthError) {
      invalidateRuntimeFormAccessJwt(runtimeState);
      jwt = await ensureRuntimeFormAccessJwt(runtimeState);
      if (!jwt) {
        return response;
      }
      response = await call(jwt);
    }
    return response;
  }

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    const context = deps.getRuntimeState();
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!context || !dataListId) {
      options.setItems([], 0);
      return;
    }

    const response = await withJwtRetry(context, (jwt) =>
      api.search({
        formId: context.formId,
        dataListId,
        formAccessJwt: jwt,
        query: options.filter,
        skip: options.skip,
        take: options.take,
      }),
    );

    if (!response.success) {
      console.error("Failed to lazy-load data list choices.", response.error);
      options.setItems([], 0);
      return;
    }

    options.setItems(
      response.data.items.map((item) => ({
        value: item.value,
        text: item.label,
      })),
      response.data.totalRecords,
    );
  };

  const onGetChoiceDisplayValue = async (
    _: Model,
    options: GetChoiceDisplayValueEvent,
  ) => {
    const context = deps.getRuntimeState();
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!context || !dataListId || options.values.length === 0) {
      return;
    }

    const response = await withJwtRetry(context, (jwt) =>
      api.getDisplayValues({
        formId: context.formId,
        dataListId,
        formAccessJwt: jwt,
        values: options.values.map(String),
      }),
    );

    if (!response.success) {
      console.error(
        "Failed to resolve data list display values.",
        response.error,
      );
      options.setItems(options.values.map(String));
      return;
    }

    const valueMap = new Map(
      response.data.map((item) => [item.value, item.label] as const),
    );
    options.setItems(
      options.values.map(
        (value) => valueMap.get(String(value)) ?? String(value),
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

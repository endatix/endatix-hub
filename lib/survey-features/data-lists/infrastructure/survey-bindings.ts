import { createEndatixPublicApi } from "@/lib/endatix-api/public";
import { ApiErrorType, ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  ensureRuntimeFormAccessJwt,
  invalidateRuntimeFormAccessJwt,
} from "@/lib/form-runtime/form-access-jwt-orchestrator";
import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";
import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import {
  ChoicesLazyLoadEvent,
  GetChoiceDisplayValueEvent,
  Model,
} from "survey-core";
import {
  notifyChoicesLazyLoadCompleted,
  shouldSuppressChoicesLazyLoad,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import { getDataListIdFromQuestion } from "./data-list-survey-integration";
import { registerDataListGlobals } from "./registry";

const DATA_LIST_HANDLERS_ATTACHED_KEY = "__endatixDataListHandlersAttached";

async function withJwtRetry<T>(
  runtimeState: FormRuntimeState,
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

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    const filter = options.filter ?? "";
    if (shouldSuppressChoicesLazyLoad(options.question, filter)) {
      options.setItems([], 0);
      return;
    }

    const runtime = resolveFormRuntimeState(deps.getRuntimeState());
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!runtime || !dataListId) {
      options.setItems([], 0);
      return;
    }

    const response = await withJwtRetry(runtime, (jwt) =>
      api.search({
        formId: runtime.formId,
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
      notifyChoicesLazyLoadCompleted(options.question, filter, 0, false);
      return;
    }

    const items = response.data.items.map((item) => ({
      value: item.value,
      text: item.label,
    }));
    options.setItems(items, response.data.totalRecords);
    notifyChoicesLazyLoadCompleted(
      options.question,
      filter,
      items.length,
      true,
    );
  };

  const onGetChoiceDisplayValue = async (
    _: Model,
    options: GetChoiceDisplayValueEvent,
  ) => {
    const runtime = resolveFormRuntimeState(deps.getRuntimeState());
    const dataListId = getDataListIdFromQuestion(options.question);
    if (!runtime || !dataListId || options.values.length === 0) {
      return;
    }

    const response = await withJwtRetry(runtime, (jwt) =>
      api.getDisplayValues({
        formId: runtime.formId,
        dataListId,
        formAccessJwt: jwt,
        values: options.values.map(String),
      }),
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

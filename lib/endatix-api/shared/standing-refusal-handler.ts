import type { ApiResult } from "./api-result";
import type { RequiredActionError } from "../auth/required-action";

// Registration survives Next's separate module instances for instrumentation and routes.
const handlerKey = Symbol.for("endatix.api.standing-refusal");
type Handler = (refusal: RequiredActionError) => Promise<void>;
type Host = typeof globalThis & { [handlerKey]?: Handler };

export function registerStandingRefusalHandler(handler?: Handler) {
  (globalThis as Host)[handlerKey] = handler;
}

export async function handleStandingRefusal<T>(result: ApiResult<T>) {
  const refusal = !result.success && result.error.details?.requiredAction;
  if (refusal) await (globalThis as Host)[handlerKey]?.(refusal);
  return result;
}

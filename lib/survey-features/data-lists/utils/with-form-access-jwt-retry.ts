import { ApiErrorType, ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  ensureRuntimeFormAccessJwt,
  invalidateRuntimeFormAccessJwt,
} from "@/lib/form-runtime/form-access-jwt-orchestrator";
import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";

/**
 * Ensures a form access JWT is available and retries the given function if an authentication error occurs.
 * @param runtimeState - The form runtime state.
 * @param call - The function to call with the JWT.
 * @returns The result of the function.
 */
export async function withFormAccessJwtRetry<T>(
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

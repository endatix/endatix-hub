import type { CreateFormAccessTokenRequest } from "@/lib/endatix-api/forms/types";
import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";

/** Shared logic for building the form access token request body (server + client safe). */
export function buildFormAccessTokenBody(
  state: FormRuntimeState,
): CreateFormAccessTokenRequest {
  if (!state.token) {
    return {};
  }

  const body: CreateFormAccessTokenRequest = { token: state.token };
  if (
    state.tokenType === "AccessToken" ||
    state.tokenType === "SubmissionToken"
  ) {
    body.tokenType = state.tokenType;
  }

  return body;
}

import {
  buildFormAccessTokenBody,
  createFormAccessToken,
} from "@/lib/form-runtime/form-access-token-client";
import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";

const MIN_VALIDITY_MS = 60_000;
const inflightByState = new WeakMap<
  FormRuntimeState,
  Promise<string | undefined>
>();

/** Clears the cached form access JWT. */
export function invalidateRuntimeFormAccessJwt(state: FormRuntimeState): void {
  state.formAccessJwt = undefined;
  state.formAccessJwtExpiresAtUtc = undefined;
}

/** Returns a cached form access JWT if it's still valid, otherwise creates a new one and caches it. */
export async function ensureRuntimeFormAccessJwt(
  state: FormRuntimeState,
): Promise<string | undefined> {
  if (!isRuntimeStateValid(state)) {
    return undefined;
  }

  const cachedToken = readValidCachedToken(state);
  if (cachedToken) {
    return cachedToken;
  }

  const inflight = inflightByState.get(state);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const result = await createFormAccessToken(
      state.formId,
      buildFormAccessTokenBody(state),
    );

    if (!result.success) {
      console.error("createFormAccessToken failed", result.error);
      return undefined;
    }

    state.formAccessJwt = result.data.token;
    state.formAccessJwtExpiresAtUtc = result.data.expiresAtUtc;
    return result.data.token;
  })();

  inflightByState.set(state, request);

  try {
    return await request;
  } finally {
    inflightByState.delete(state);
  }
}

/** Returns the cached form access JWT if it's still valid, otherwise undefined. */
function readValidCachedToken(state: FormRuntimeState): string | undefined {
  if (!state.formAccessJwt || !state.formAccessJwtExpiresAtUtc) {
    return undefined;
  }

  const expiresAtMs = Date.parse(state.formAccessJwtExpiresAtUtc);
  if (!Number.isFinite(expiresAtMs)) {
    return undefined;
  }

  if (expiresAtMs - Date.now() <= MIN_VALIDITY_MS) {
    return undefined;
  }

  return state.formAccessJwt;
}

function isRuntimeStateValid(state: FormRuntimeState): boolean {
  if (typeof state.formId === "string" && state.formId.trim().length > 0) {
    return true;
  }

  // Defensive guard: avoid hitting token endpoint with invalid runtime context.
  console.error("Invalid form runtime state: formId is required.");
  return false;
}

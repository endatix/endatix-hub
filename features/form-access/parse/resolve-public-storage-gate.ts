import type { Session } from "next-auth";
import { Result } from "@/lib/result";
import { optionalPartialCookie, type FormStorageGateInput } from "../types";
import { validateGateInput } from "./validate-gate-input";
import { formAccessForbidden } from "../http/form-access-result";
import {
  resolveStorageGateInput,
  type ResolveStorageGateInputOptions,
} from "./resolve-gate-from-request";

/** Merges cookie + body gate fields and validates ids for public storage routes. */
export async function resolvePublicStorageGate(
  gate: FormStorageGateInput,
  session: Session | null,
  options: ResolveStorageGateInputOptions = {},
): Promise<Result<FormStorageGateInput>> {
  const resolvedGate = await resolveStorageGateInput(gate, {
    ...options,
    allowCookieFallback: options.allowCookieFallback ?? !session?.accessToken,
  });

  return validateGateInput(resolvedGate);
}

/** A personal link selects its submission snapshot; an ordinary resume cookie is optional. */
export async function resolveAuthoredImageGate(
  gate: FormStorageGateInput,
  session: Session | null,
) {
  const { tokenType, ...credentialInput } = gate;
  const result = await resolvePublicStorageGate(credentialInput, session, {
    allowCookieFallback: true,
  });
  if (Result.isError(result)) return result;
  if (gate.token && tokenType && tokenType !== result.value.tokenType) {
    return formAccessForbidden<FormStorageGateInput>("Form access denied");
  }
  if (gate.token || gate.submissionId) return result;
  if (result.value.tokenType !== "SubmissionToken") return result;
  return Result.success({
    ...result.value,
    [optionalPartialCookie]: true as const,
  });
}

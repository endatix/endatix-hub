import type { Session } from "next-auth";
import { Result } from "@/lib/result";
import { optionalPartialCookie, type FormStorageGateInput } from "../types";
import { validateGateInput } from "./validate-gate-input";
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
export async function resolveAuthoredImageGate(gate: FormStorageGateInput, session: Session | null) {
  const result = await resolvePublicStorageGate(gate, session, { allowCookieFallback: true });
  if (Result.isError(result)) return result;
  if (!session?.accessToken || gate.token || gate.submissionId) return result;
  if (result.value.tokenType !== "SubmissionToken") return result;
  return Result.success({ ...result.value, [optionalPartialCookie]: true as const });
}

import type { Session } from "next-auth";
import { Result } from "@/lib/result";
import type { FormStorageGateInput } from "../types";
import { validateGateInput } from "./validate-gate-input";
import {
  resolveStorageGateInput,
  type ResolveStorageGateInputOptions,
} from "./resolve-gate-from-request";

/** Merges cookie + body gate fields and validates ids for respondent storage routes. */
export async function resolveRespondentGate(
  gate: FormStorageGateInput,
  session: Session | null,
  options: ResolveStorageGateInputOptions = {},
): Promise<Result<FormStorageGateInput>> {
  const resolvedGate = await resolveStorageGateInput(gate, {
    ...options,
    allowCookieFallback:
      options.allowCookieFallback ?? !session?.accessToken,
  });

  return validateGateInput(resolvedGate);
}

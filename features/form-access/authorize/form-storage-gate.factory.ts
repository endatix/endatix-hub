import type { Session } from "next-auth";
import { Result } from "@/lib/result";
import { resolvePublicStorageGate } from "../parse/resolve-public-storage-gate";
import type { ResolveStorageGateInputOptions } from "../parse/resolve-gate-from-request";
import { validateGateInput } from "../parse/validate-gate-input";
import type { FormStorageAccess, FormStorageGateInput } from "../types";
import { runFormStorageGateStrategies } from "./strategies/run-gate-strategies";

export interface FormStorageGateContext {
  /** Hub user access token — enables public form policy for private forms when no respondent token. */
  hubAccessToken?: string;
}

export type FormStorageAuthorizeOptions = FormStorageGateContext;

export interface IFormStorageGateService {
  authorize(gate: FormStorageGateInput): Promise<Result<FormStorageAccess>>;
  authorizeRespondent(
    gate: FormStorageGateInput,
    session: Session | null,
    options?: ResolveStorageGateInputOptions,
  ): Promise<Result<FormStorageAccess>>;
}

export function createFormStorageGateService(
  context: FormStorageGateContext = {},
): IFormStorageGateService {
  const defaultHubAccessToken = context.hubAccessToken;

  return {
    async authorize(gate) {
      const validated = validateGateInput(gate);
      if (Result.isError(validated)) {
        return validated;
      }

      return runFormStorageGateStrategies(validated.value, {
        hubAccessToken: defaultHubAccessToken,
      });
    },

    async authorizeRespondent(gate, session, options = {}) {
      const validated = await resolvePublicStorageGate(gate, session, options);
      if (Result.isError(validated)) {
        return validated;
      }

      return runFormStorageGateStrategies(validated.value, {
        hubAccessToken: defaultHubAccessToken ?? session?.accessToken,
      });
    },
  };
}

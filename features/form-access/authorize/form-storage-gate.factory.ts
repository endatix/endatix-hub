import type { Session } from "next-auth";
import { Result } from "@/lib/result";
import {
  createFormAccessProvider,
  type FormAccessProvider,
} from "../infrastructure/form-access.provider";
import { resolveRespondentGate } from "../parse/resolve-respondent-gate";
import type { ResolveStorageGateInputOptions } from "../parse/resolve-gate-from-request";
import { validateGateInput } from "../parse/validate-gate-input";
import type { FormStorageAccess, FormStorageGateInput } from "../types";
import { runFormStorageGateStrategies } from "./strategies/run-gate-strategies";

export interface FormStorageGateContext {
  /** Hub user access token — enables public form policy for private forms when no respondent token. */
  hubAccessToken?: string;
  /** Override for tests. */
  formAccessProvider?: FormAccessProvider;
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
  const formAccessProvider =
    context.formAccessProvider ?? createFormAccessProvider();
  const defaultHubAccessToken = context.hubAccessToken;

  return {
    async authorize(gate) {
      const validated = validateGateInput(gate);
      if (Result.isError(validated)) {
        return validated;
      }

      return runFormStorageGateStrategies(validated.value, {
        hubAccessToken: defaultHubAccessToken,
        formAccessProvider,
      });
    },

    async authorizeRespondent(gate, session, options = {}) {
      const validated = await resolveRespondentGate(gate, session, options);
      if (Result.isError(validated)) {
        return validated;
      }

      return runFormStorageGateStrategies(validated.value, {
        hubAccessToken: defaultHubAccessToken ?? session?.accessToken,
        formAccessProvider,
      });
    },
  };
}

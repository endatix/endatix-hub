import { Result } from "@/lib/result";
import { formAccessForbidden } from "../../http/form-access-result";
import type { FormStorageAccess, FormStorageGateInput } from "../../types";
import { anonymousPublicFormStrategy } from "./anonymous-public-form.strategy";
import type { FormStorageGateRunContext } from "./gate-context";
import { hubPolicyStrategy } from "./hub-policy.strategy";
import { tokenGateStrategy } from "./token-gate.strategy";

export type { FormStorageGateRunContext } from "./gate-context";

/**
 * Runs gate strategies in h415 order (fail closed):
 * token → hub policy (success only) → anonymous public definition → forbidden.
 */
export async function runFormStorageGateStrategies(
  gate: FormStorageGateInput,
  options: { hubAccessToken?: string },
): Promise<Result<FormStorageAccess>> {
  const context: FormStorageGateRunContext = {
    gate,
    hubAccessToken: options.hubAccessToken,
  };

  if (gate.token) {
    return tokenGateStrategy(context);
  }

  if (options.hubAccessToken) {
    const policyResult = await hubPolicyStrategy(context);
    if (Result.isSuccess(policyResult)) {
      return policyResult;
    }
  }

  const publicFormResult = await anonymousPublicFormStrategy(context);
  if (Result.isSuccess(publicFormResult)) {
    return publicFormResult;
  }

  return formAccessForbidden("Form access denied");
}

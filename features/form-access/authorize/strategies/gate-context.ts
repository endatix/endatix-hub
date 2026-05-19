import type { FormAccessProvider } from "../../infrastructure/form-access.provider";
import type { FormStorageGateInput } from "../../types";

/** Context for form storage gate strategies. */
export interface FormStorageGateRunContext {
  gate: FormStorageGateInput;
  hubAccessToken?: string;
  formAccessProvider: FormAccessProvider;
}

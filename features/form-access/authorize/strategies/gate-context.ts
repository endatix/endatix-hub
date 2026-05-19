import type { FormStorageGateInput } from "../../types";

export interface FormStorageGateRunContext {
  gate: FormStorageGateInput;
  hubAccessToken?: string;
}

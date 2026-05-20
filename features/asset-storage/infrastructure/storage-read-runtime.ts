import type { FormStorageTokenType } from "@/features/form-access";
import type { StorageApiPolicy } from "./storage-api-policy";

export type { StorageApiPolicy } from "./storage-api-policy";

/** Storage read runtime settings for public or hub storage policy. */
export type StorageReadRuntime = {
  policyName: StorageApiPolicy;
  formId?: string;
  templateId?: string;
  submissionId?: string;
  token?: string;
  tokenType?: FormStorageTokenType;
};

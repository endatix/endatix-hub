import { Result } from "@/lib/result";
import type { FormStorageAccess, FormStorageGateInput } from "../types";
import {
  createFormStorageGateService,
  type FormStorageAuthorizeOptions,
} from "./form-storage-gate.factory";

/**
 * Authorizes public-form storage using the Endatix API as the trust anchor (submission/access token,
 * anonymous active definition for public forms, or public form access policy with Hub session).
 */
export async function authorizeFormStorageAccess(
  input: FormStorageGateInput,
  options: FormStorageAuthorizeOptions = {},
): Promise<Result<FormStorageAccess>> {
  return createFormStorageGateService(options).authorize(input);
}

export type { FormStorageAuthorizeOptions };

"use server";

import { EndatixApi, isNotFoundError, type PublicTenant } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { RegistrationRequestSchema } from "@/features/auth/shared/auth.schemas";
import { parseZodError } from "@/lib/utils/zod-error-utils";

export async function getPublicTenantAction(
  slug: string,
): Promise<Result<PublicTenant>> {
  const api = new EndatixApi();
  const loaded = await api.publicTenants.getBySlug(slug);
  if (!loaded.success) {
    if (isNotFoundError(loaded)) {
      return Result.error("This tenant sign-in link is not valid.");
    }

    return mapApiErrorToResult(loaded, {
      fallbackMessage: "Failed to load tenant",
    });
  }

  return Result.success(loaded.data);
}

export type TenantRegisterState = {
  success: boolean;
  errors?: {
    email?: string[];
    password?: string[];
  };
  errorMessage?: string;
  formData?: FormData;
};

export async function registerTenantAccountAction(
  tenantSlug: string,
  _previous: unknown,
  formData: FormData,
): Promise<TenantRegisterState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const validatedFields = RegistrationRequestSchema.safeParse({
    email,
    password,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: parseZodError(validatedFields.error).fields,
      formData,
    };
  }

  const api = new EndatixApi();
  const registered = await api.auth.register({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
    confirmPassword: validatedFields.data.password,
    tenantSlug,
  });

  if (!registered.success) {
    const mapped = mapApiErrorToResult(registered, {
      fallbackMessage:
        "We cannot create your account at this time. Please try again later.",
    });
    return {
      success: false,
      errorMessage: Result.isError(mapped) ? mapped.message : "Failed to create account.",
      formData,
    };
  }

  return { success: true };
}

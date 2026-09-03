"use server";

import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { RegistrationRequestSchema } from "@/features/auth/shared/auth.schemas";
import { parseZodError } from "@/lib/utils/zod-error-utils";

const LOGGER_NAME = "public-tenants";

export async function getPublicTenantAction(publicId: string) {
  const apiResult = await new EndatixApi().publicTenants.getBySlug(publicId);
  return toResult(apiResult, {
    fallbackMessage: "Failed to load tenant",
    logMessage: "Failed to load public tenant",
    loggerName: LOGGER_NAME,
  });
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

  const apiResult = await new EndatixApi().auth.register({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
    confirmPassword: validatedFields.data.password,
    tenantSlug,
  });
  const registered = toResult(apiResult, {
    fallbackMessage:
      "We cannot create your account at this time. Please try again later.",
    logMessage: "Failed to register tenant account",
    loggerName: LOGGER_NAME,
  });

  if (Result.isError(registered)) {
    return {
      success: false,
      errorMessage: registered.message,
      formData,
    };
  }

  return { success: true };
}

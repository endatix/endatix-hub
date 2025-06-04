"use server";

import { register, RegistrationResponse } from "@/services/api";
import { RegistrationRequestSchema } from "../../shared/auth.schemas";

const CONNECTION_REFUSED_CODE = "ECONNREFUSED";

interface CreateAccountActionState {
  success: boolean;
  errors?: FieldErrors;
  errorMessage?: string;
  formData?: FormData;
}

interface FieldErrors {
  email?: string[];
  password?: string[];
}

export async function createAccountAction(
  _: unknown,
  formData: FormData,
): Promise<CreateAccountActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  const validatedFields = RegistrationRequestSchema.safeParse({
    email: email,
    password: password,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      formData
    } as CreateAccountActionState;
  }

  try {
    const response = await register({
      email: validatedFields.data.email,
      password: validatedFields.data.password,
      confirmPassword: validatedFields.data.password,
    });

    if (!response.success) {
      return {
        success: false,
        errorMessage: response.message,
        formData
      };
    }

    return { success: true };
  } catch (error: unknown) {
    let errorMessage = "We cannot create your account at this time. Please try again later.";
    
    if (error instanceof Error) {
      if (error?.cause &&
          typeof error.cause === "object" &&
          "code" in error.cause &&
          error.cause.code == CONNECTION_REFUSED_CODE) {
        errorMessage = "Failed to connect to the Endatix API. Ensure your network connection and app settings are correct";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      errorMessage: errorMessage,
      formData
    } as CreateAccountActionState;
  }
}

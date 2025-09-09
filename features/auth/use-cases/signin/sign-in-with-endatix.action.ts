"use server";

import { SignInRequestSchema } from "@/lib/endatix-api";
import { signIn } from "@/auth";
import {
  ENDATIX_AUTH_PROVIDER_ID,
  InvalidCredentialsError,
  InvalidInputError,
  NetworkError,
  ServerError,
  UnknownError,
} from "@/features/auth/infrastructure/providers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { SIGNIN_ERROR_PATH } from "../../infrastructure/auth-constants";

interface SignInFormState {
  isSuccess?: boolean;
  formErrors?: string[];
  errors?: {
    email?: string[];
    password?: string[];
  };
  values?: {
    email?: string;
    password?: string;
    returnUrl?: string;
  };
}

// This is the action that is used to sign in with Endatix internal auth provider
export async function signInWithEndatixAction(
  _prevState: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    returnUrl: formData.get("returnUrl") as string,
  };

  const validatedData = SignInRequestSchema.safeParse(rawData);
  const errors = validatedData.error?.flatten();

  if (!validatedData.success) {
    return {
      isSuccess: false,
      formErrors: errors?.formErrors,
      errors: errors?.fieldErrors,
      values: rawData,
    };
  }

  try {
    await signIn(ENDATIX_AUTH_PROVIDER_ID, {
      email: validatedData.data.email,
      password: validatedData.data.password,
      redirectTo: validatedData.data.returnUrl,
    });
  } catch (error: unknown) {
    // handle redirect error, which is handled by Next.js to complete the redirect
    if (isRedirectError(error)) {
      throw error;
    }

    let errorMessage =
      "There was an error signing you in. Please try again and submit a support request if the problem persists.";
    let errors = {};

    switch (true) {
      case error instanceof InvalidCredentialsError:
        errorMessage = error.cause?.message as string;
        break;
      case error instanceof InvalidInputError:
        errors = error.issues;
        break;
      case error instanceof NetworkError:
      case error instanceof ServerError:
      case error instanceof UnknownError:
        return redirect(`${SIGNIN_ERROR_PATH}?error=${error.type}`);
      case error instanceof Error:
        errorMessage = error.message;
        break;
      default:
        errorMessage =
          "There was an error signing you in. Please try again and submit a support request if the problem persists.";
        break;
    }

    return {
      isSuccess: false,
      formErrors: [errorMessage],
      errors: errors,
      values: rawData,
    };
  }

  return {
    isSuccess: true,
  };
}

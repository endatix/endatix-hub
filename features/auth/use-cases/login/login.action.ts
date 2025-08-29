"use server";

import { AuthService } from "@/features/auth";
import { ApiResult, SignInRequestSchema, EndatixApi } from "@/lib/endatix-api";

interface LoginFormState {
  isSuccess?: boolean;
  formErrors?: string[];
  errors?: {
    email?: string[];
    password?: string[];
  };
  values?: {
    email?: string;
    password?: string;
  };
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
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

  const endatix = new EndatixApi();
  const signInResult = await endatix.auth.signIn(validatedData.data);

  if (!ApiResult.isSuccess(signInResult)) {
    return {
      isSuccess: false,
      formErrors: [signInResult.error.message],
      errors: signInResult.error.fields,
      values: rawData,
    };
  }

  const { accessToken, refreshToken, email } = signInResult.data;
  const authService = new AuthService();
  try {
    await authService.login(accessToken, refreshToken, email);
  } catch (error: unknown) {
    let errorMessage =
      "There was an error signing you in. Please try again and submit a support request if the problem persists.";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      isSuccess: false,
      formErrors: [errorMessage],
      values: rawData,
    };
  }

  return {
    isSuccess: true,
  };
}

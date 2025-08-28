"use server";

import { AuthService } from "@/features/auth";
import { AuthenticationRequestSchema } from "../../shared/auth.schemas";
import { AuthenticationRequest } from "../../shared/auth.types";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";

interface LoginActionState {
  success: boolean;
  errors?: FieldErrors;
  errorMessage?: string;
  formData?: FormData;
}

interface FieldErrors {
  email?: string[];
  password?: string[];
}

export async function loginAction(
  _: unknown,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  const validatedFields = AuthenticationRequestSchema.safeParse({
    email: email,
    password: password,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      formData,
    } as LoginActionState;
  }

  const data = validatedFields.data;
  const authRequest: AuthenticationRequest = {
    email: data.email,
    password: data.password,
  };

  const endatix = new EndatixApi();
  const authenticationResponse = await endatix.auth.signIn(authRequest);
  if (!ApiResult.isSuccess(authenticationResponse)) {
    return {
      success: false,
      errorMessage: authenticationResponse.error?.message,
      formData,
    } as LoginActionState;
  }
  const {
    email: userEmail,
    accessToken,
    refreshToken,
  } = authenticationResponse.data;
  const authService = new AuthService();
  try {
    await authService.login(accessToken, refreshToken, userEmail);
  } catch (error: unknown) {
    let errorMessage =
      "There was an error signing you in. Please try again and submit a support request if the problem persists.";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      errorMessage: errorMessage,
      formData,
    } as LoginActionState;
  }

  return { success: true };
}

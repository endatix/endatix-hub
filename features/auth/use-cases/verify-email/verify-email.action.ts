"use server";

import { verifyEmail } from "@/services/api";

const CONNECTION_REFUSED_CODE = "ECONNREFUSED";

interface VerifyEmailActionState {
  success: boolean;
  errorMessage?: string;
  userId?: string;
}

export async function verifyEmailAction(
  token: string,
): Promise<VerifyEmailActionState> {
  if (!token) {
    return {
      success: false,
      errorMessage: "Verification token is required",
    };
  }

  try {
    const userId = await verifyEmail({ token });
    return { success: true, userId };
  } catch (error: unknown) {
    let errorMessage = "We cannot verify your email at this time. Please try again later.";
    
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
    };
  }
} 
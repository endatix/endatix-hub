"use server";

import { sendVerification } from "@/services/api";

const CONNECTION_REFUSED_CODE = "ECONNREFUSED";

interface SendVerificationActionState {
  success: boolean;
  errorMessage?: string;
}

export async function sendVerificationAction(
  email: string,
): Promise<SendVerificationActionState> {
  if (!email) {
    return {
      success: false,
      errorMessage: "Email address is required",
    };
  }

  try {
    const response = await sendVerification({ email });
    
    // The API returns a string message on success
    if (response && typeof response === 'string') {
      return { success: true };
    } else {
      return {
        success: false,
        errorMessage: "Invalid response from server",
      };
    }
  } catch (error: unknown) {
    let errorMessage = "We cannot send the verification email at this time. Please try again later.";
    
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
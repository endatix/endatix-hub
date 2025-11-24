import { redirect } from "next/navigation";
import {
  isAuthenticationRequired,
  isPermissionDenied,
  AuthorizationError,
  isInvalidTokenError,
} from "../domain/authorization-result";
import {
  SIGNIN_PATH,
  AUTH_ERROR_PATH,
  UNAUTHORIZED_PATH,
} from "../../infrastructure/auth-constants";
import { AuthErrorType } from "../../shared/auth.types";

export function handlePermissionError(
  permissionError: AuthorizationError,
): never {
  if (!permissionError) {
    throw new Error("An unexpected error occurred while checking permissions");
  }

  if (isInvalidTokenError(permissionError)) {
    redirect(`${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`);
  }

  if (isPermissionDenied(permissionError)) {
    redirect(UNAUTHORIZED_PATH);
  }

  if (isAuthenticationRequired(permissionError)) {
    redirect(SIGNIN_PATH);
  }

  throw new Error(
    permissionError.error?.message ||
      "An unexpected error occurred while checking permissions",
  );
}

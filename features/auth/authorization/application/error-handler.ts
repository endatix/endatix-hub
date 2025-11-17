import { redirect } from "next/navigation";
import {
  isAuthenticationRequired,
  isPermissionDenied,
  AuthorizationError,
} from "../domain/authorization-result";
import {
  SIGNIN_PATH,
  UNAUTHORIZED_PATH,
} from "../../infrastructure/auth-constants";

export function handlePermissionError(
  permissionError: AuthorizationError,
): never {
  if (!permissionError) {
    throw new Error("An unexpected error occurred while checking permissions");
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

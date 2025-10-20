import { redirect } from "next/navigation";
import {
  isAuthenticationRequired,
  isPermissionDenied,
  PermissionError,
} from "../result/permission-result";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "../../infrastructure";

export function handlePermissionError(permissionError: PermissionError): never {
  if (!permissionError) {
    throw new Error("An unexpected error occurred while checking permissions");
  }

  if (isPermissionDenied(permissionError)) {
    return redirect(UNAUTHORIZED_PATH);
  }

  if (isAuthenticationRequired(permissionError)) {
    return redirect(SIGNIN_PATH);
  }

  throw new Error(
    permissionError.error?.message ||
      "An unexpected error occurred while checking permissions",
  );
}

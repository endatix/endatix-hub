import { RetryRequest } from "@/components/error-handling/retry-request";
import { AuthStatus } from "../ui/auth-status";

export function RetryStatus() {
  return (
    <AuthStatus tone="warning" title="Account status is unavailable">
      <RetryRequest />
    </AuthStatus>
  );
}

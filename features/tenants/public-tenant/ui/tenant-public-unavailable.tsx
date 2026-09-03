import type { Error as ResultError } from "@/lib/result";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";

/** Renders the failure of a public tenant load: 404 gets its own copy, everything else surfaces the API message. */
export function TenantPublicUnavailable({
  error,
}: Readonly<{ error: ResultError }>) {
  const notFound = error.statusCode === 404;

  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone={notFound ? "warning" : "error"}
        title={notFound ? "Tenant not found" : "We couldn't load this page"}
        description={
          notFound
            ? "This link is not valid. Ask the organization for a current one."
            : error.message
        }
      />
    </>
  );
}

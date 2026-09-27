import { SignupRequestsList } from "@/features/platform-admin/list-signup-requests/ui/signup-requests-list";
import { listSignupRequests } from "@/features/platform-admin/list-signup-requests/list-signup-requests.server";
import { parseSignupRequestsListParams } from "@/features/platform-admin/list-signup-requests/parse-signup-requests-params";
import type { SignupRequestsSearchParams } from "@/features/platform-admin/list-signup-requests/types";
import { requirePlatformAdmin } from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { getAllFlags } from "@/lib/feature-flags/flags";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { notFound } from "next/navigation";

interface SignupRequestsPageProps {
  searchParams?: Promise<SignupRequestsSearchParams>;
}

export default async function SignupRequestsPage({
  searchParams,
}: Readonly<SignupRequestsPageProps>) {
  const flags = await getAllFlags();
  if (!flags.saasManagement) {
    notFound();
  }

  const [session, resolvedSearchParams] = await Promise.all([
    requirePlatformAdmin(),
    searchParams,
  ]);
  const listRequest = parseSignupRequestsListParams(resolvedSearchParams);
  const requestsPromise = listSignupRequests(session, listRequest);

  return (
    <PlatformAdminShell
      title="Signup Requests"
      description="Review workspace requests submitted from the public signup page."
    >
      <SignupRequestsList
        requestsPromise={requestsPromise}
        listKey={listQueryKey(listRequest)}
      />
    </PlatformAdminShell>
  );
}

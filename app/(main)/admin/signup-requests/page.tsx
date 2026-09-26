import { listSignupRequests } from '@/features/platform-admin/list-signup-requests/list-signup-requests.server';
import { parseSignupRequestsListParams } from '@/features/platform-admin/signup-requests/parse-signup-requests-params';
import type { SignupRequestsSearchParams } from '@/features/platform-admin/signup-requests/types';
import { SignupRequestsTable } from '@/features/platform-admin/signup-requests/ui/signup-requests-table';
import { requirePlatformAdmin } from '@/features/platform-admin/server';
import { PlatformAdminShell } from '@/features/platform-admin/ui/platform-admin-shell';
import { getAllFlags } from '@/lib/feature-flags/flags';
import { notFound } from 'next/navigation';

interface SignupRequestsPageProps {
  searchParams?: Promise<SignupRequestsSearchParams>;
}

export default async function SignupRequestsPage({
  searchParams,
}: SignupRequestsPageProps) {
  const flags = await getAllFlags();
  if (!flags.saasManagement) {
    notFound();
  }

  const session = await requirePlatformAdmin();
  const requests = await listSignupRequests(
    session,
    parseSignupRequestsListParams(await searchParams),
  );

  if (requests === null) {
    notFound();
  }

  return (
    <PlatformAdminShell
      title="Signup requests"
      description="Review workspace requests from the public waitlist and approve or reject them."
    >
      <SignupRequestsTable requests={requests} />
    </PlatformAdminShell>
  );
}

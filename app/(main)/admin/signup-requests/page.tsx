import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listSignupRequests } from '@/features/platform-admin/list-signup-requests/list-signup-requests.server';
import { parseSignupRequestsListParams } from '@/features/platform-admin/signup-requests/parse-signup-requests-params';
import type { SignupRequestsSearchParams } from '@/features/platform-admin/signup-requests/types';
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.items.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.email}</TableCell>
              <TableCell>{request.companyName ?? '—'}</TableCell>
              <TableCell>{request.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PlatformAdminShell>
  );
}

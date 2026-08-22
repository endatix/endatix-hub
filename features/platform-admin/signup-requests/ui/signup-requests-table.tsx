'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  SignupRequestListItem,
  SignupRequestsPagedResponse,
} from '@/lib/endatix-api/signup-requests/types';
import { getFormattedDate } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ApproveSignupRequestDialog } from './approve-signup-request-dialog';
import { RejectSignupRequestDialog } from './reject-signup-request-dialog';

interface SignupRequestsTableProps {
  requests: SignupRequestsPagedResponse;
}

export function SignupRequestsTable({
  requests,
}: Readonly<SignupRequestsTableProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [approveTarget, setApproveTarget] = useState<SignupRequestListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SignupRequestListItem | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const updateQuery = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Signup requests</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search email or company"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  updateQuery({ search: search.trim() || undefined, page: '1' });
                }
              }}
              className="sm:w-72"
            />
            <Select
              value={searchParams.get('status') ?? 'pending'}
              onValueChange={(value) => updateQuery({ status: value, page: '1' })}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => updateQuery({ search: search.trim() || undefined, page: '1' })}
            >
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provisioning</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No signup requests match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                requests.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.email}</TableCell>
                    <TableCell>{request.companyName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.provisioningStatus}</TableCell>
                    <TableCell>{getFormattedDate(request.createdAt)}</TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setApproveTarget(request)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget(request)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApproveSignupRequestDialog
        request={approveTarget}
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
          }
        }}
      />
      <RejectSignupRequestDialog
        request={rejectTarget}
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
      />
    </>
  );
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'approved') {
    return 'default';
  }

  if (status === 'rejected') {
    return 'destructive';
  }

  return 'secondary';
}

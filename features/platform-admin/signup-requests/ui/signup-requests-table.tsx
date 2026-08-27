'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  createPagedTableFooterProps,
  PagedTableFooter,
  TableSearchInput,
} from '@/components/table';
import { useListUrlState } from '@/lib/list-page/use-list-url-state';
import { normalizePagedResponse } from '@/lib/endatix-api/shared/paged-response';
import type { SignupRequestListItem } from '@/lib/endatix-api/signup-requests/types';
import type { SignupRequestsPagedResponse } from '@/lib/endatix-api/signup-requests/types';
import { getFormattedDate } from '@/lib/utils';
import { useState } from 'react';
import { ApproveSignupRequestDialog } from './approve-signup-request-dialog';
import { RejectSignupRequestDialog } from './reject-signup-request-dialog';

interface SignupRequestsTableProps {
  requests: SignupRequestsPagedResponse;
}

export function SignupRequestsTable({
  requests,
}: Readonly<SignupRequestsTableProps>) {
  const { search, setSearch, updateUrl, searchParams } = useListUrlState();
  const [approveTarget, setApproveTarget] = useState<SignupRequestListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SignupRequestListItem | null>(null);

  const paged = normalizePagedResponse(requests);
  const status = searchParams.get('status') ?? 'pending';

  return (
    <>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Signup requests</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search email or company"
              ariaLabel="Search signup requests"
              className="sm:w-72"
            />
            <Select
              value={status}
              onValueChange={(value) => updateUrl({ status: value, page: '1' })}
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
              {paged.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No signup requests match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paged.items.map((request) => (
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
        <PagedTableFooter
          {...createPagedTableFooterProps(paged, 'signup requests', updateUrl)}
        />
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

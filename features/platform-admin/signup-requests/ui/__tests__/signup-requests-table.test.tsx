import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignupRequestsTable } from '../signup-requests-table';
import type { SignupRequestsPagedResponse } from '@/lib/endatix-api/signup-requests/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/signup-requests',
  useSearchParams: () => new URLSearchParams('status=pending'),
}));

vi.mock('../../signup-requests.actions', () => ({
  approveSignupRequestAction: vi.fn(),
  rejectSignupRequestAction: vi.fn(),
}));

const REQUESTS: SignupRequestsPagedResponse = {
  page: 1,
  pageSize: 20,
  totalPages: 1,
  totalRecords: 1,
  items: [
    {
      id: '1',
      email: 'prospect@example.com',
      companyName: 'Acme',
      status: 'pending',
      provisioningStatus: 'none',
      rejectionComment: null,
      tenantName: null,
      approvedTenantId: null,
      decidedByUserId: null,
      createdAt: '2026-01-15T00:00:00.000Z',
      modifiedAt: null,
    },
  ],
};

describe('SignupRequestsTable', () => {
  it('shows approve and reject actions for pending requests', () => {
    render(<SignupRequestsTable requests={REQUESTS} />);

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
    expect(screen.getByText('prospect@example.com')).toBeTruthy();
  });
});

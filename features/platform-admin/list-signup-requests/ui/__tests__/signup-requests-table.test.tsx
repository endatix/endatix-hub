import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { SignupRequestView } from "../../../review-signup-request/types";
import { SignupRequestsTable } from "../signup-requests-table";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/signup-requests",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock(
  "@/features/platform-admin/review-signup-request/review-signup-request.actions",
  () => ({
    approveSignupRequestAction: vi.fn(),
    rejectSignupRequestAction: vi.fn(),
    retrySignupProvisioningAction: vi.fn(),
  }),
);

function requests(count: number): SignupRequestView[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${index + 1}`,
    email: `requester-${index + 1}@example.com`,
    companyName: null,
    status: "Pending",
    provisioningStatus: "NotStarted",
    rejectionComment: null,
    tenantName: null,
    approvedTenantId: null,
    decidedByUserId: null,
    createdAt: "2026-10-01T10:00:00Z",
    modifiedAt: null,
    visitor: null,
  }));
}

describe("SignupRequestsTable", () => {
  it("shows every request of a 50-request server page", () => {
    // Arrange
    const page = normalizePagedResponse({
      items: requests(50),
      page: 1,
      pageSize: 50,
      totalRecords: 120,
      totalPages: 3,
    });

    // Act
    render(
      <SignupRequestsTable
        requests={page}
        reviewers={{}}
        updateUrl={vi.fn()}
        urlState={{ search: "", status: "pending" }}
        isPending={false}
        onClearFilters={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getAllByText(/^requester-\d+@example\.com$/)).toHaveLength(
      50,
    );
  });
});

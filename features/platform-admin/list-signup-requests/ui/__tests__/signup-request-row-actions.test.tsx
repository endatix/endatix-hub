import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import { SignupRequestRowActions } from "../signup-request-row-actions";

vi.mock("../../signup-requests.actions", () => ({
  retrySignupProvisioningAction: vi.fn(),
}));

function request(
  overrides: Partial<SignupRequestListItem>,
): SignupRequestListItem {
  return {
    id: "1",
    email: "prospect@example.com",
    companyName: "Acme",
    status: "pending",
    provisioningStatus: "none",
    rejectionComment: null,
    tenantName: null,
    approvedTenantId: null,
    decidedByUserId: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    modifiedAt: null,
    ...overrides,
  };
}

describe("SignupRequestRowActions", () => {
  it("offers approve and reject for a pending request", () => {
    render(
      <SignupRequestRowActions
        request={request({})}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
  });

  it("offers retry only when an approved request failed to provision", () => {
    render(
      <SignupRequestRowActions
        request={request({ status: "approved", provisioningStatus: "failed" })}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("offers no decision for a rejected request", () => {
    render(
      <SignupRequestRowActions
        request={request({ status: "rejected" })}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});

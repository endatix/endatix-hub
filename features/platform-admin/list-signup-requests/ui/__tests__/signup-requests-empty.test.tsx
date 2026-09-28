import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { SignupRequestsUrlState } from "../../signup-requests-url-state";
import { SignupRequestsTable } from "../signup-requests-table";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock(
  "@/features/platform-admin/review-signup-request/review-signup-request.actions",
  () => ({
    approveSignupRequestAction: vi.fn(),
    rejectSignupRequestAction: vi.fn(),
    retrySignupProvisioningAction: vi.fn(),
  }),
);

const updateUrl = vi.fn();
const onClearFilters = vi.fn();

function renderEmpty(urlState: Partial<SignupRequestsUrlState>) {
  return render(
    <SignupRequestsTable
      requests={normalizePagedResponse(null)}
      reviewers={{}}
      updateUrl={updateUrl}
      urlState={{ search: "", status: "pending", ...urlState }}
      isPending={false}
      onClearFilters={onClearFilters}
    />,
  );
}

describe("SignupRequestsTable empty states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says the queue is clear on the default view and offers every request", () => {
    // Act
    renderEmpty({});
    fireEvent.click(screen.getByRole("button", { name: "Show all requests" }));

    // Assert
    expect(screen.getByText("No requests waiting for a decision")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(updateUrl).toHaveBeenCalledWith({ status: "all", page: "1" });
  });

  it("names the search and offers a way out", () => {
    // Act
    renderEmpty({ search: "acme", status: "approved" });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Assert
    expect(screen.getByText("No matching requests")).toBeTruthy();
    expect(screen.getByText(/No approved request matches “acme”/)).toBeTruthy();
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("reads as a fresh inbox when nothing was ever submitted", () => {
    // Act
    renderEmpty({ status: "all" });

    // Assert
    expect(screen.getByText("No signup requests yet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Show all requests" }),
    ).toBeNull();
  });
});

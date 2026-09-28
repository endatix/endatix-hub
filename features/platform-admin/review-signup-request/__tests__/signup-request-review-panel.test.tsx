import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import { Result } from "@/lib/result";
import {
  approveSignupRequestAction,
  rejectSignupRequestAction,
  retrySignupProvisioningAction,
} from "../review-signup-request.actions";
import { SignupRequestReviewPanel } from "../ui/signup-request-review-panel";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../review-signup-request.actions", () => ({
  approveSignupRequestAction: vi.fn(),
  rejectSignupRequestAction: vi.fn(),
  retrySignupProvisioningAction: vi.fn(),
}));

function request(
  overrides: Partial<SignupRequestListItem> = {},
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
    createdAt: "2026-01-15T10:00:00.000Z",
    modifiedAt: null,
    ...overrides,
  };
}

function renderPanel(item: SignupRequestListItem) {
  return render(
    <SignupRequestReviewPanel
      request={item}
      open
      reviewers={{ "42": "Ada Admin" }}
      onOpenChange={vi.fn()}
    />,
  );
}

// Radix tooltips (copy / truncated-id affordances) measure with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("SignupRequestReviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("shows the record before any decision control", () => {
    // Act
    renderPanel(request());

    // Assert
    expect(screen.getByText("Request")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve…" })).toBeTruthy();
    expect(screen.queryByLabelText("Workspace name")).toBeNull();
    expect(screen.queryByText("Activity")).toBeNull();
  });

  it("shows PostHog links only when the loader supplied them", () => {
    // Act
    renderPanel(
      request({
        activity: {
          sessionHref: "https://us.posthog.com/project/1/replay/sess",
          profileHref: "https://us.posthog.com/project/1/persons/anon",
        },
      }),
    );

    // Assert
    expect(screen.getByRole("link", { name: "Session" }).getAttribute("href")).toBe(
      "https://us.posthog.com/project/1/replay/sess",
    );
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe(
      "https://us.posthog.com/project/1/persons/anon",
    );
  });

  it("approves with the suggested workspace name and shows the outcome", async () => {
    // Arrange
    vi.mocked(approveSignupRequestAction).mockResolvedValue(
      Result.success(
        request({
          status: "approved",
          provisioningStatus: "succeeded",
          tenantName: "Acme",
          approvedTenantId: "900",
          decidedByUserId: "42",
          modifiedAt: "2026-01-16T10:00:00.000Z",
        }),
      ),
    );
    renderPanel(request());

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Approve…" }));
    expect(
      (screen.getByLabelText("Workspace name") as HTMLInputElement).value,
    ).toBe("Acme");
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and create workspace" }),
    );

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Workspace ready")).toBeTruthy(),
    );
    expect(approveSignupRequestAction).toHaveBeenCalledWith("1", "Acme");
    expect(screen.getByText("Ada Admin")).toBeTruthy();
  });

  it("requires a reason before rejecting", async () => {
    // Arrange
    vi.mocked(rejectSignupRequestAction).mockResolvedValue(
      Result.success(
        request({
          status: "rejected",
          rejectionComment: "Duplicate of an existing tenant.",
          decidedByUserId: "42",
        }),
      ),
    );
    renderPanel(request());
    fireEvent.click(screen.getByRole("button", { name: "Reject…" }));
    const submit = screen.getByRole("button", { name: "Reject request" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    // Act
    fireEvent.change(screen.getByLabelText("Why is this request rejected?"), {
      target: { value: "Duplicate of an existing tenant." },
    });
    fireEvent.click(submit);

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Request rejected")).toBeTruthy(),
    );
    expect(screen.getByText("Duplicate of an existing tenant.")).toBeTruthy();
  });

  it("keeps a validation error under its field", async () => {
    // Arrange
    vi.mocked(approveSignupRequestAction).mockResolvedValue(
      Result.validationError("Tenant name is already taken."),
    );
    renderPanel(request());
    fireEvent.click(screen.getByRole("button", { name: "Approve…" }));

    // Act
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and create workspace" }),
    );

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Tenant name is already taken.")).toBeTruthy(),
    );
    expect(
      screen.getByLabelText("Workspace name").getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("offers a retry for a failed setup and names an unknown decider by id", () => {
    // Act
    renderPanel(
      request({
        status: "approved",
        provisioningStatus: "failed",
        tenantName: "Acme",
        approvedTenantId: "900",
        decidedByUserId: "77",
      }),
    );

    // Assert
    expect(screen.getByText("Workspace setup failed")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Retry workspace setup" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve…" })).toBeNull();
    expect(retrySignupProvisioningAction).not.toHaveBeenCalled();
    expect(screen.getByText("Admin")).toBeTruthy();
  });
});

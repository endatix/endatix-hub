import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SignupRequestView } from "../types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  approveSignupRequestAction,
  getSignupVisitorAction,
  rejectSignupRequestAction,
  retrySignupProvisioningAction,
} from "../review-signup-request.actions";
import { SignupRequestReviewPanel } from "../ui/signup-request-review-panel";
import { clearSignupVisitorCache } from "../ui/signup-visitor-section";

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
  getSignupVisitorAction: vi.fn(),
}));

function request(
  overrides: Partial<SignupRequestView> = {},
): SignupRequestView {
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
    visitor: null,
    ...overrides,
  };
}

function renderPanel(item: SignupRequestView) {
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
    clearSignupVisitorCache();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("shows the record before any decision control", () => {
    // Act
    renderPanel(request());

    // Assert
    expect(screen.getByText("Request")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve…" })).toBeTruthy();
    expect(screen.queryByLabelText("Workspace name")).toBeNull();
    expect(screen.queryByText("PostHog")).toBeNull();
  });

  it("keeps review actions usable while PostHog loads", async () => {
    // Arrange
    let resolveLookup: (lookup: {
      status: "missing";
      profileHref: string;
    }) => void = () => {};
    vi.mocked(getSignupVisitorAction).mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );

    // Act
    renderPanel(request({ visitor: { distinctId: "anon", sessionId: null } }));

    // Assert
    expect(screen.getByRole("button", { name: "Approve…" })).toBeTruthy();
    expect(
      screen.getByText("Loading visitor details from PostHog"),
    ).toBeTruthy();

    resolveLookup({
      status: "missing",
      profileHref: "https://us.posthog.com/project/1/persons/anon",
    });
    await waitFor(() =>
      expect(screen.getByText(/no activity for this visitor/)).toBeTruthy(),
    );
  });

  it("shows what PostHog recorded when the request has a visitor", async () => {
    // Arrange
    vi.mocked(getSignupVisitorAction).mockResolvedValue({
      status: "found",
      visitor: {
        profileHref: "https://us.posthog.com/project/1/persons/anon",
        firstSeenAt: "2026-01-15T09:00:00.000Z",
        location: "Sofia, Bulgaria",
        timeZone: null,
        browser: "Chrome 153",
        os: "Mac OS X",
        device: "Desktop",
        cameFrom: "Direct visit (no referrer)",
        campaign: null,
        landingPage: "/signin",
        timeline: [
          {
            kind: "pageview",
            label: "Viewed /signup",
            timestamp: "2026-01-15T09:59:00.000Z",
            count: 2,
          },
          {
            kind: "signup",
            label: "Requested a workspace",
            timestamp: "2026-01-15T10:00:00.000Z",
            count: 1,
          },
        ],
      },
    });

    // Act
    renderPanel(request({ visitor: { distinctId: "anon", sessionId: null } }));

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Sofia, Bulgaria")).toBeTruthy(),
    );
    expect(getSignupVisitorAction).toHaveBeenCalledWith({
      distinctId: "anon",
      sessionId: null,
    });
    expect(screen.getByText("Chrome 153 on Mac OS X")).toBeTruthy();
    const steps = screen
      .getByRole("list", { name: "Visitor activity recorded by PostHog" })
      .querySelectorAll('[data-slot="timeline-item"]');
    expect(steps[0].textContent).toContain("Viewed /signup ×2");
    expect(steps[1].hasAttribute("data-active")).toBe(true);
    expect(
      screen.getByRole("link", { name: /PostHog/ }).getAttribute("href"),
    ).toBe("https://us.posthog.com/project/1/persons/anon");
    expect(screen.queryByText(/Session replay/)).toBeNull();
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

  it("keeps the visitor section after a decision", async () => {
    // Arrange
    const visitor = { distinctId: "anon", sessionId: null };
    vi.mocked(getSignupVisitorAction).mockResolvedValue({
      status: "missing",
      profileHref: "https://us.posthog.com/project/1/persons/anon",
    });
    vi.mocked(rejectSignupRequestAction).mockResolvedValue(
      Result.success(
        request({
          status: "rejected",
          rejectionComment: "Spam.",
          decidedByUserId: "42",
          decidedAt: "2026-01-16T10:00:00.000Z",
          visitor,
        }),
      ),
    );
    renderPanel(request({ visitor }));
    await screen.findByRole("link", { name: /PostHog/ });
    fireEvent.click(screen.getByRole("button", { name: "Reject…" }));
    fireEvent.change(screen.getByLabelText("Why is this request rejected?"), {
      target: { value: "Spam." },
    });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Reject request" }));

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Request rejected")).toBeTruthy(),
    );
    const link = screen.getByRole("link", { name: /PostHog/ });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(getSignupVisitorAction).toHaveBeenCalledOnce();
    expect(screen.getByText("Decided")).toBeTruthy();
    expect(screen.queryByText("Last updated")).toBeNull();
  });

  it("falls back to the last update for a decision without a timestamp", () => {
    // Act
    renderPanel(
      request({
        status: "rejected",
        rejectionComment: "Spam.",
        decidedByUserId: "42",
        modifiedAt: "2026-01-16T10:00:00.000Z",
      }),
    );

    // Assert
    expect(screen.getByText("Last updated")).toBeTruthy();
    expect(screen.queryByText("Decided")).toBeNull();
  });
});

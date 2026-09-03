import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import { SupportAccessBannerView } from "../ui/support-access-banner-view";

const toastError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

describe("SupportAccessBanner", () => {
  it("shows the tenant name when provided", () => {
    render(
      <SupportAccessBannerView
        tenantName="Acme"
        exitAction={vi.fn().mockResolvedValue(Result.success(true))}
      />,
    );

    expect(screen.getByText("Support access — Acme")).toBeTruthy();
    expect(screen.getByRole("button", { name: /exit tenant/i })).toBeTruthy();
  });

  it("falls back to a generic title without a tenant name", () => {
    render(
      <SupportAccessBannerView
        exitAction={vi.fn().mockResolvedValue(Result.success(true))}
      />,
    );

    expect(screen.getByText("Support access")).toBeTruthy();
  });

  it("hides the banner when dismissed", () => {
    render(
      <SupportAccessBannerView
        tenantName="Acme"
        exitAction={vi.fn().mockResolvedValue(Result.success(true))}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss support access banner/i }),
    );

    expect(screen.queryByText("Support access — Acme")).toBeNull();
  });

  it("surfaces a failed exit instead of leaving the session assumed silently", async () => {
    render(
      <SupportAccessBannerView
        tenantName="Acme"
        exitAction={vi.fn().mockResolvedValue(Result.error("Failed to exit"))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /exit tenant/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Failed to exit"),
    );
    expect(screen.getByText("Support access — Acme")).toBeTruthy();
  });
});

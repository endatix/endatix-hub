import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SupportAccessBannerView } from "../ui/support-access-banner-view";

describe("SupportAccessBanner", () => {
  it("shows the tenant name when provided", () => {
    render(
      <SupportAccessBannerView
        title="Support access — Acme"
        exitAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Support access — Acme")).toBeTruthy();
    expect(screen.getByRole("button", { name: /exit tenant/i })).toBeTruthy();
  });

  it("falls back to a generic title without a tenant name", () => {
    render(
      <SupportAccessBannerView title="Support access" exitAction={vi.fn()} />,
    );

    expect(screen.getByText("Support access")).toBeTruthy();
  });

  it("hides the banner when dismissed", () => {
    render(
      <SupportAccessBannerView
        title="Support access — Acme"
        exitAction={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss support access banner/i }),
    );

    expect(screen.queryByText("Support access — Acme")).toBeNull();
  });
});

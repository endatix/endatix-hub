import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandProvider } from "@/lib/branding/brand-provider";
import { packBrand } from "@/test/pack-brand";
import { renderWithBrand } from "@/test/render-with-brand";
import { ReleaseVersionLink } from "../ui/release-version-link";

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({ trackEvent: vi.fn() }),
}));

const link = (
  <ReleaseVersionLink product="hub" version="0.9.2" source="about_dialog" />
);

describe("ReleaseVersionLink under a brand", () => {
  it("links Endatix release notes with no brand pack", () => {
    renderWithBrand(link);

    expect(
      screen.getByRole("link", { name: /0\.9\.2/ }).getAttribute("href"),
    ).toMatch(
      /^https:\/\/github\.com\/endatix\/endatix-hub\/releases\/tag\/v0\.9\.2/,
    );
  });

  it("shows the version unlinked under a pack", () => {
    render(<BrandProvider brand={packBrand()}>{link}</BrandProvider>);

    expect(screen.getByText("0.9.2")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildIdentity } from "@/lib/hosting/build-identity";
import type { ProductVersions } from "../../types";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({ trackEvent: vi.fn() }),
}));

const getProductVersionsAction = vi.fn<() => Promise<ProductVersions>>();
vi.mock("../get-product-versions.action", () => ({
  getProductVersionsAction: () => getProductVersionsAction(),
}));

const SHA = "8ef28cee396f8dfb959d40c34868314585659f28";

function release(version: string): BuildIdentity {
  return { version, branch: null, commit: SHA };
}

/** Fresh module per test: the dialog keeps a complete read for the page. */
async function renderDialog(open = true) {
  vi.resetModules();
  const { AboutEndatixDialog } = await import("../ui/about-endatix-dialog");
  return render(<AboutEndatixDialog open={open} onOpenChange={vi.fn()} />);
}

describe("AboutEndatixDialog", () => {
  beforeEach(() => {
    getProductVersionsAction.mockReset();
  });

  it("does not ask for versions until it opens", async () => {
    // Act
    await renderDialog(false);

    // Assert
    expect(getProductVersionsAction).not.toHaveBeenCalled();
  });

  it("links each version to its tracked release notes", async () => {
    // Arrange
    getProductVersionsAction.mockResolvedValue({
      hub: release("0.8.0"),
      api: release("0.7.7"),
    });

    // Act
    await renderDialog();
    const hub = await screen.findByRole("link", { name: /0\.8\.0/ });

    // Assert
    const url = new URL(hub.getAttribute("href")!);
    expect(url.pathname).toBe("/endatix/endatix-hub/releases/tag/v0.8.0");
    expect(url.searchParams.get("utm_medium")).toBe("about_dialog");
    expect(screen.getByRole("link", { name: /0\.7\.7/ })).toBeDefined();
  });

  it("keeps the Hub version when the API does not answer", async () => {
    // Arrange
    getProductVersionsAction.mockResolvedValue({
      hub: release("0.8.0"),
      api: null,
    });

    // Act
    await renderDialog();

    // Assert
    expect(await screen.findByRole("link", { name: /0\.8\.0/ })).toBeDefined();
    expect(screen.getByText("Not available")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Copy versions" }),
    ).toHaveProperty("disabled", false);
  });

  it("shows the branch and commit of a build that is not a release, unlinked", async () => {
    // Arrange
    getProductVersionsAction.mockResolvedValue({
      hub: {
        version: null,
        branch: "feat/h134-show-product-versions",
        commit: SHA,
      },
      api: release("0.7.7"),
    });

    // Act
    await renderDialog();

    // Assert
    expect(
      await screen.findByText("feat/h134-show-product-versions"),
    ).toBeDefined();
    expect(screen.getByText("8ef28ce")).toBeDefined();
    expect(screen.getByRole("button", { name: "Copy branch" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Copy commit" })).toBeDefined();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shortens a very long branch name, keeping both ends", async () => {
    // Arrange
    getProductVersionsAction.mockResolvedValue({
      hub: {
        version: null,
        branch: "feat/h134-show-product-versions-in-the-about-dialog",
        commit: SHA,
      },
      api: null,
    });

    // Act
    await renderDialog();

    // Assert
    expect(
      await screen.findByText("feat/h134-show-p…the-about-dialog"),
    ).toBeDefined();
  });
});

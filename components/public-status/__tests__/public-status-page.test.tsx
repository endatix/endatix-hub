import {
  POWERED_BY_URL,
  PublicStatusPage,
} from "@/components/public-status/public-status-page";
import {
  hydrateBrowserEndatixConfig,
  resetBrowserEndatixConfigForTests,
  EMPTY_CLIENT_ENDATIX_CONFIG,
} from "@/features/config/client-endatix-config";
import { render, screen } from "@testing-library/react";
import { SearchX } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

function renderPage(props: { showPoweredBy?: boolean } = {}) {
  return render(
    <PublicStatusPage
      icon={SearchX}
      layout="page"
      message="Check the link and try again."
      note="You can close this tab."
      title="We couldn't find that survey."
      tone="neutral"
      {...props}
    />,
  );
}

describe("PublicStatusPage", () => {
  afterEach(() => {
    resetBrowserEndatixConfigForTests();
  });

  it("renders the title as the page heading with message and note", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "We couldn't find that survey.",
      }),
    ).toBeDefined();
    expect(screen.getByText("Check the link and try again.")).toBeDefined();
    expect(screen.getByText("You can close this tab.")).toBeDefined();
  });

  it("shows a quiet Powered by Endatix link by default", () => {
    renderPage();

    const link = screen.getByRole("link", { name: "Endatix" });
    expect(link.getAttribute("href")).toBe(POWERED_BY_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.parentElement?.textContent).toBe("Powered by Endatix");
  });

  it("hides Powered by when the deployment turns it off", () => {
    hydrateBrowserEndatixConfig({
      ...EMPTY_CLIENT_ENDATIX_CONFIG,
      showPoweredBy: false,
    });

    renderPage();

    expect(screen.queryByText(/Powered by/)).toBeNull();
  });

  it("lets a caller override the deployment setting", () => {
    renderPage({ showPoweredBy: false });

    expect(screen.queryByRole("link", { name: "Endatix" })).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenPersonalLink } from "../ui/open-personal-link";

const { openPersonalLinkAction, replace } = vi.hoisted(() => ({
  openPersonalLinkAction: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("../open-personal-link.action", () => ({ openPersonalLinkAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const FORM_ID = "1525035735390879744";
const LINK_TOKEN = "link-token";

describe("OpenPersonalLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redeems nothing while the page is rendered on the server", () => {
    const html = renderToString(
      <OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />,
    );

    expect(html).toContain("Opening your survey");
    expect(openPersonalLinkAction).not.toHaveBeenCalled();
  });

  it("redeems once after it mounts, then replaces the page with the survey", async () => {
    openPersonalLinkAction.mockResolvedValue({ kind: "opened" });

    render(
      <StrictMode>
        <OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/share/${FORM_ID}`),
    );
    expect(openPersonalLinkAction).toHaveBeenCalledTimes(1);
    expect(openPersonalLinkAction).toHaveBeenCalledWith(FORM_ID, LINK_TOKEN);
  });

  it("says the link is not valid when the API does not know it", async () => {
    openPersonalLinkAction.mockResolvedValue({ kind: "notFound" });

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);

    expect(await screen.findByText("This link is not valid.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("offers Try again when the link could not be opened, and opens it on the retry", async () => {
    openPersonalLinkAction
      .mockResolvedValueOnce({ kind: "unavailable" })
      .mockResolvedValueOnce({ kind: "opened" });

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/share/${FORM_ID}`),
    );
    expect(openPersonalLinkAction).toHaveBeenCalledTimes(2);
  });
});

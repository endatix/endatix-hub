import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { OpenPersonalLink } from "../ui/open-personal-link";

const { openPersonalLinkAction, replace, logError } = vi.hoisted(() => ({
  openPersonalLinkAction: vi.fn(),
  replace: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("../open-personal-link.action", () => ({ openPersonalLinkAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: logError },
}));

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
    openPersonalLinkAction.mockResolvedValue(Result.success(undefined));

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
    openPersonalLinkAction.mockResolvedValue(
      Result.validationError("This link is not valid."),
    );

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);

    expect(
      await screen.findByRole("heading", { name: "This link is not valid." }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("offers Try again when the link could not be opened, and opens it on the retry", async () => {
    openPersonalLinkAction
      .mockResolvedValueOnce(Result.error("Busy"))
      .mockResolvedValueOnce(Result.success(undefined));

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/share/${FORM_ID}`),
    );
    expect(openPersonalLinkAction).toHaveBeenCalledTimes(2);
  });

  it("offers Try again when the request itself fails, and reloads the page on the retry", async () => {
    openPersonalLinkAction.mockRejectedValue(new TypeError("Failed to fetch"));
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(openPersonalLinkAction).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("logs a rejected call without the link's token", async () => {
    const failure = new TypeError("Failed to fetch");
    openPersonalLinkAction.mockRejectedValue(failure);

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);
    await screen.findByRole("button", { name: "Try again" });

    expect(logError).toHaveBeenCalledWith(
      "Failed to open a personalized link.",
      failure,
      { formId: FORM_ID },
      "public-form.open-personal-link",
    );
    expect(JSON.stringify(logError.mock.calls)).not.toContain(LINK_TOKEN);
  });

  it("spins the loader while it opens the link", () => {
    openPersonalLinkAction.mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />,
    );

    expect(container.querySelector("svg")?.getAttribute("class")).toMatch(
      /spin/,
    );
  });

  it("announces each state in one polite live region", async () => {
    openPersonalLinkAction.mockResolvedValue(
      Result.validationError("This link is not valid."),
    );

    render(<OpenPersonalLink formId={FORM_ID} token={LINK_TOKEN} />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("Opening your survey…");

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        "This link is not valid.",
      ),
    );
    expect(screen.getByRole("status")).toBe(region);
  });
});

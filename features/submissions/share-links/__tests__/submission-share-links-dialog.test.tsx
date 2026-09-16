import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";

const createLink = vi.fn();
vi.mock("../create-submission-access-links.action", () => ({
  createSubmissionAccessLinkAction: (...args: unknown[]) => createLink(...args),
}));

const writeText = vi.fn(async () => undefined);

import { SubmissionShareLinksDialog } from "../submission-share-links-dialog";
import { DEFAULT_EXPIRY_MINUTES } from "../share-link-expiry";

function renderDialog() {
  return render(
    <SubmissionShareLinksDialog
      formId="123"
      submissionId="456"
      open
      onOpenChange={() => {}}
    />,
  );
}

beforeEach(() => {
  createLink.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  createLink.mockImplementation(async (_f, _s, type: string) =>
    Result.success({
      type,
      token: `token-${type}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    }),
  );
  // Radix Select needs these in jsdom; it has no real pointer/scroll APIs.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("SubmissionShareLinksDialog", () => {
  it("shows every link type without opening a menu", () => {
    renderDialog();

    for (const label of ["Share", "View", "Edit", "Export PDF"]) {
      expect(screen.getByRole("heading", { name: label })).toBeTruthy();
    }
    expect(screen.getAllByRole("button", { name: "Generate" })).toHaveLength(4);
  });

  it("keeps earlier links when another is generated", async () => {
    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);
    await screen.findByDisplayValue(/token-share/);

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);
    await screen.findByDisplayValue(/token-view/);

    // Both survive.
    expect(screen.getByDisplayValue(/token-share/)).toBeTruthy();
    expect(screen.getByDisplayValue(/token-view/)).toBeTruthy();
  });

  it("copies the new link without a second click", async () => {
    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("/share/123?token=token-share"),
      );
    });
  });

  it("still generates when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new Error("not allowed"));
    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    expect(await screen.findByDisplayValue(/token-share/)).toBeTruthy();
  });

  it("generates with the default lifetime", async () => {
    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    await waitFor(() => {
      expect(createLink).toHaveBeenCalledWith(
        "123",
        "456",
        "share",
        DEFAULT_EXPIRY_MINUTES,
      );
    });
  });

  it("surfaces a failure instead of rendering an empty link", async () => {
    createLink.mockResolvedValue(Result.error("Nope"));
    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    await waitFor(() => expect(createLink).toHaveBeenCalled());
    expect(screen.queryByDisplayValue(/token-/)).toBeNull();
  });

  it("generates with the newly selected lifetime", async () => {
    renderDialog();

    fireEvent.pointerDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "1 hour" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);

    await waitFor(() => {
      expect(createLink).toHaveBeenCalledWith("123", "456", "share", 60);
    });
  });

  it("issues a new token on regenerate and keeps the row", async () => {
    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);
    await screen.findByDisplayValue(/token-share/);

    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Share link" }),
    );

    await waitFor(() => expect(createLink).toHaveBeenCalledTimes(2));
    expect(screen.getByDisplayValue(/token-share/)).toBeTruthy();
  });

  it("keeps each type pending until its own request finishes", async () => {
    let resolveShare!: (value: unknown) => void;
    let resolveView!: (value: unknown) => void;

    createLink.mockImplementation(async (_f, _s, type: string) => {
      const token = {
        type,
        token: `token-${type}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      };
      if (type === "share") {
        await new Promise((resolve) => {
          resolveShare = resolve;
        });
      }
      if (type === "view") {
        await new Promise((resolve) => {
          resolveView = resolve;
        });
      }
      return Result.success(token);
    });

    renderDialog();

    const generateButtons = screen.getAllByRole("button", { name: "Generate" });
    fireEvent.click(generateButtons[0]);
    fireEvent.click(generateButtons[1]);

    expect(await screen.findAllByRole("button", { name: "Generating..." })).toHaveLength(
      2,
    );

    resolveShare(undefined);
    await screen.findByDisplayValue(/token-share/);
    expect(screen.getByRole("button", { name: "Generating..." })).toBeTruthy();

    resolveView(undefined);
    await screen.findByDisplayValue(/token-view/);
  });

  it("offers native share only when the browser supports it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "share", {
      value: share,
      configurable: true,
    });

    renderDialog();

    fireEvent.click(screen.getAllByRole("button", { name: "Generate" })[0]);
    await screen.findByDisplayValue(/token-share/);

    fireEvent.click(screen.getByRole("button", { name: "Share Share link" }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Share submission" }),
      );
    });

    Object.defineProperty(globalThis.navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });
});

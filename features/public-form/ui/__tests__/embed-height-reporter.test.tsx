import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbedHeightReporter } from "../embed-height-reporter";

vi.mock("@/features/embed-form/ui/embed-messaging-context", () => ({
  getEmbedMessagingContext: vi.fn(() => ({
    embedId: "embed-1",
    parentOrigin: "https://host.example",
  })),
}));

const originalParent = window.parent;

function setBodyHeight(height: number): void {
  Object.defineProperty(document.body, "scrollHeight", {
    configurable: true,
    value: height,
  });
}

describe("EmbedHeightReporter", () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage },
    });
    setBodyHeight(640);
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: originalParent,
    });
  });

  it("reports the smaller height when the complete page replaces the form (h947)", async () => {
    // Arrange
    render(<EmbedHeightReporter />);
    await waitFor(() => {
      expect(postMessage).toHaveBeenLastCalledWith(
        { type: "endatix:resize", embedId: "embed-1", height: 640 },
        "https://host.example",
      );
    });

    // Act - the thank-you page is shorter than the form it replaces.
    setBodyHeight(180);
    act(() => {
      document.body.appendChild(document.createElement("div"));
    });

    // Assert
    await waitFor(() => {
      expect(postMessage).toHaveBeenLastCalledWith(
        { type: "endatix:resize", embedId: "embed-1", height: 180 },
        "https://host.example",
      );
    });
  });

  it("stops reporting after unmount", async () => {
    // Arrange
    const { unmount } = render(<EmbedHeightReporter />);
    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledTimes(1);
    });

    // Act
    unmount();
    setBodyHeight(900);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    // Assert
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});

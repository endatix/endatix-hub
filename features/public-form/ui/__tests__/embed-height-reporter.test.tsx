import { embedHeightReporting } from "@/features/embed-form/ui/embed-height-reporting";
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
    embedHeightReporting.resume();
    postMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage },
    });
    setBodyHeight(640);
  });

  afterEach(() => {
    cleanup();
    embedHeightReporting.resume();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: originalParent,
    });
  });

  it("stops reporting smaller heights while frozen and resumes when unfrozen", async () => {
    render(<EmbedHeightReporter />);

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledTimes(1);
    });
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        type: "endatix:resize",
        embedId: "embed-1",
        height: 640,
      },
      "https://host.example",
    );

    embedHeightReporting.freeze();
    setBodyHeight(120);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(postMessage).toHaveBeenCalledTimes(1);

    embedHeightReporting.resume();
    setBodyHeight(720);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledTimes(2);
    });
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        type: "endatix:resize",
        embedId: "embed-1",
        height: 720,
      },
      "https://host.example",
    );
  });
});

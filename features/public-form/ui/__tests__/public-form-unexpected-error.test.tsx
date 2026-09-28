import { PublicFormUnexpectedError } from "@/features/public-form/ui/public-form-unexpected-error";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const trackException = vi.fn();

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({ trackException }),
}));

vi.mock("@/features/public-form/ui/embed-height-reporter", () => ({
  EmbedHeightReporter: () => <div data-testid="embed-height-reporter" />,
}));

describe("PublicFormUnexpectedError", () => {
  it("offers a retry and a digest reference, never the raw error message", () => {
    // Arrange
    const retry = vi.fn();
    const error = Object.assign(new Error("TypeError: x is undefined"), {
      digest: "3141592653",
    });

    // Act
    render(
      <PublicFormUnexpectedError error={error} retry={retry} variant="share" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Assert
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText("3141592653")).toBeDefined();
    expect(screen.queryByText(/x is undefined/)).toBeNull();
    expect(trackException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        digest: "3141592653",
        surface: "public-form-share",
      }),
    );
  });

  it("reports iframe height in an embed", () => {
    render(
      <PublicFormUnexpectedError
        error={new Error("boom")}
        retry={vi.fn()}
        variant="embed"
      />,
    );

    expect(screen.getByTestId("embed-height-reporter")).toBeDefined();
    expect(screen.queryByText("Reference")).toBeNull();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnexpectedErrorView } from "../unexpected-error-view";

const trackException = vi.fn();

vi.mock("@/features/analytics/posthog", () => ({
  useTrackEvent: () => ({ trackException }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe("UnexpectedErrorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Next.js digest and reports it to telemetry", () => {
    // Arrange
    const error = Object.assign(
      new Error("An error occurred in the Server Component"),
      {
        digest: "3804550175",
      },
    );

    // Act
    render(<UnexpectedErrorView error={error} retry={() => undefined} />);

    // Assert
    expect(screen.getByLabelText("Copy Digest")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Copy Digest"));
    expect(mockWriteText).toHaveBeenCalledWith("3804550175");
    expect(trackException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ digest: "3804550175" }),
    );
  });

  it("copies digest in diagnostics and blanks the row when digest is missing", async () => {
    // Arrange
    const withDigest = Object.assign(new Error("boom"), {
      digest: "3804550175",
    });
    const { rerender } = render(
      <UnexpectedErrorView error={withDigest} retry={() => undefined} />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Copy Diagnostics" }));

    // Assert
    expect(mockWriteText).toHaveBeenCalled();
    expect(String(mockWriteText.mock.calls.at(-1)?.[0])).toContain(
      "Digest: 3804550175",
    );

    rerender(
      <UnexpectedErrorView
        error={new Error("client-only")}
        retry={() => undefined}
      />,
    );
    expect(screen.getByText("Digest")).toBeDefined();
    expect(screen.getAllByLabelText("Not available").length).toBeGreaterThan(0);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("copies digest in diagnostics and blanks the Digest row when digest is missing", async () => {
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
    const digestRow = screen.getByText("Digest").closest("div");
    expect(
      digestRow?.querySelector('[aria-label="Not available"]'),
    ).not.toBeNull();
  });

  it("gives a client error an Error ID: shown, copied, and reported", async () => {
    // Arrange
    const clientId = "0b0e3d64-0c3f-4b9a-9f39-5c1c8e8c2b11";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(clientId);
    const error = new Error("Cannot read properties of undefined");

    // Act
    render(<UnexpectedErrorView error={error} retry={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Diagnostics" }));

    // Assert
    expect(screen.getByLabelText("Copy Error ID")).toBeDefined();
    expect(screen.queryByLabelText("Copy Trace ID")).toBeNull();
    await vi.waitFor(() =>
      expect(String(mockWriteText.mock.calls.at(-1)?.[0])).toContain(
        `Error ID: ${clientId}`,
      ),
    );
    const reported = trackException.mock.calls.at(-1)?.[1];
    expect(reported).toMatchObject({ clientErrorId: clientId });
    expect(reported).not.toHaveProperty("traceId");
  });

  it("shows only the Trace ID for an error that has a real one", () => {
    // Arrange
    const error = Object.assign(new Error("api"), {
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    });

    // Act
    render(<UnexpectedErrorView error={error} retry={() => undefined} />);

    // Assert
    expect(screen.getByLabelText("Copy Trace ID")).toBeDefined();
    expect(screen.queryByText("Error ID")).toBeNull();
    expect(trackException.mock.calls.at(-1)?.[1]).not.toHaveProperty(
      "clientErrorId",
    );
  });

  it("does not mint an Error ID for a server error with a digest", () => {
    // Arrange
    const error = Object.assign(new Error("server"), { digest: "3804550175" });

    // Act
    render(<UnexpectedErrorView error={error} retry={() => undefined} />);

    // Assert
    expect(screen.queryByText("Error ID")).toBeNull();
    expect(screen.queryByLabelText("Copy Trace ID")).toBeNull();
    expect(trackException.mock.calls.at(-1)?.[1]).not.toHaveProperty(
      "clientErrorId",
    );
  });

  it("gives caller diagnostics without ids an Error ID too", () => {
    // Arrange
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "7d1c9a52-1b2e-4c3f-8a9b-0c1d2e3f4a5b",
    );

    // Act
    render(
      <UnexpectedErrorView
        error={new Error("client")}
        retry={() => undefined}
        diagnostics={{ statusCode: 500 }}
      />,
    );

    // Assert
    expect(screen.getByLabelText("Copy Error ID")).toBeDefined();
  });
});

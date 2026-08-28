import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncateId } from "@/components/common/truncated-id";
import { Result } from "@/lib/result";
import { ResultLoadErrorView } from "../result-load-error-view";

const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

const TRACE_ID = "00-15ceb2d6a7b35125152d10c131b11672-28c1e891c501df6c-00";

describe("ResultLoadErrorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("truncates Trace ID in the support box and copies the full id on hover copy", () => {
    // Arrange
    const result = Result.validationError(
      "We have a problem",
      "We have a problem",
      "ValidationError",
      { statusCode: 400, traceId: TRACE_ID },
    );
    if (!Result.isError(result)) {
      throw new Error("expected error result");
    }

    // Act
    render(<ResultLoadErrorView result={result} onRetry={() => undefined} />);

    // Assert
    expect(screen.getByText(truncateId(TRACE_ID, 8))).toBeDefined();
    expect(screen.queryByText(TRACE_ID)).toBeNull();
    fireEvent.click(screen.getByLabelText("Copy Trace ID"));
    expect(mockWriteText).toHaveBeenCalledWith(TRACE_ID);
  });

  it("puts the full Trace ID in Copy Diagnostics, not the truncated display", async () => {
    // Arrange
    const result = Result.validationError(
      "We have a problem",
      "We have a problem",
      "ValidationError",
      { statusCode: 400, traceId: TRACE_ID },
    );
    if (!Result.isError(result)) {
      throw new Error("expected error result");
    }
    render(<ResultLoadErrorView result={result} onRetry={() => undefined} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Copy Diagnostics" }));

    // Assert
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
    const payload = String(mockWriteText.mock.calls.at(-1)?.[0]);
    expect(payload).toContain(`Trace ID: ${TRACE_ID}`);
    expect(payload).toContain("Digest: n/a");
    expect(payload).not.toContain(truncateId(TRACE_ID, 8));
  });

  it("shows a dash for absent diagnostics rather than a sentence", () => {
    // Arrange
    const result = Result.error("boom");
    if (!Result.isError(result)) {
      throw new Error("expected error result");
    }

    // Act
    render(<ResultLoadErrorView result={result} onRetry={() => undefined} />);

    // Assert
    // Absent values read as blanks on a form, not as apologies for what is missing.
    expect(screen.getByText("Trace ID")).toBeDefined();
    expect(screen.getByText("Digest")).toBeDefined();
    expect(screen.getAllByLabelText("Not available").length).toBeGreaterThan(1);
    expect(screen.queryByLabelText("Copy Trace ID")).toBeNull();
  });
});

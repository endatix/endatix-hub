import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
import { HubPageLoadError } from "../hub-page-load-error";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("HubPageLoadError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ResultLoadErrorView chrome for a network Result", () => {
    // Arrange
    const result = Result.error(
      "Network error. Failed to connect to the Endatix API.",
      undefined,
      ERROR_CODE.NETWORK_ERROR,
      { statusCode: 503 },
    );
    if (!Result.isError(result)) {
      throw new Error("expected error result");
    }

    // Act
    render(<HubPageLoadError result={result} />);

    // Assert
    expect(
      screen.getByRole("heading", {
        name: "A temporary network issue interrupted this request.",
      }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeDefined();
  });

  it("refreshes the route when Try Again is clicked", () => {
    // Arrange
    const result = Result.error("boom");
    if (!Result.isError(result)) {
      throw new Error("expected error result");
    }
    render(<HubPageLoadError result={result} />);

    // Act
    screen.getByRole("button", { name: "Try Again" }).click();

    // Assert
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

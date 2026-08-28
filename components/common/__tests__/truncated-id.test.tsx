import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TruncatedId, truncateId } from "@/components/common/truncated-id";

const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

vi.mock("../ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("truncateId", () => {
  it("returns short ids unchanged", () => {
    // Arrange & Act & Assert
    expect(truncateId("abc")).toBe("abc");
    expect(truncateId("12345678")).toBe("12345678");
  });

  it("truncates long ids to first and last 4 characters", () => {
    // Arrange
    const id = "1329400665130139648";

    // Act
    const result = truncateId(id);

    // Assert
    expect(result).toBe("1329\u20269648");
  });

  it("truncates W3C trace ids with 8 visible characters per side", () => {
    // Arrange
    const id = "00-15ceb2d6a7b35125152d10c131b11672-28c1e891c501df6c-00";

    // Act
    const result = truncateId(id, 8);

    // Assert
    expect(result).toBe("00-15ceb\u20261df6c-00");
    expect(result.length).toBeLessThan(id.length);
  });
});

describe("TruncatedId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty label when id is blank", () => {
    // Arrange & Act
    render(<TruncatedId id="   " />);

    // Assert
    expect(screen.getByText("N/A")).toBeDefined();
    expect(screen.queryByLabelText("Copy ID")).toBeNull();
  });

  it("renders truncated id with copy control for long values", () => {
    // Arrange
    const id = "1329400665130139648";

    // Act
    render(<TruncatedId id={id} />);

    // Assert
    expect(screen.getByText("1329\u20269648")).toBeDefined();
    expect(screen.getByLabelText("Copy ID")).toBeDefined();
  });

  it("copies the full id when copy is clicked", () => {
    // Arrange
    const id = "1329400665130139648";
    render(<TruncatedId id={id} />);

    // Act
    fireEvent.click(screen.getByLabelText("Copy ID"));

    // Assert
    expect(mockWriteText).toHaveBeenCalledWith(id);
  });
});

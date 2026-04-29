import AlreadyResponded from "@/features/public-form/ui/already-responded";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("AlreadyResponded", () => {
  it("renders title and message", () => {
    // Arrange
    const message = "A custom already-responded message.";

    // Act
    render(<AlreadyResponded message={message} />);

    // Assert
    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(screen.getByText(message)).toBeDefined();
  });
});

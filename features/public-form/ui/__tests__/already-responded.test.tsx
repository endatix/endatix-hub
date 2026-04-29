import AlreadyResponded from "@/features/public-form/ui/already-responded";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("AlreadyResponded", () => {
  it("renders nested metadata message", () => {
    // Arrange
    const metadata = JSON.stringify({
      alreadyResponded: { message: "A custom already-responded message." },
    });

    // Act
    render(<AlreadyResponded metadata={metadata} />);

    // Assert
    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(
      screen.getByText("A custom already-responded message."),
    ).toBeDefined();
  });

  it("falls back to default message for invalid metadata", () => {
    // Act
    render(<AlreadyResponded metadata="null" />);

    // Assert
    expect(
      screen.getByText("You have already submitted a response for this form."),
    ).toBeDefined();
  });
});

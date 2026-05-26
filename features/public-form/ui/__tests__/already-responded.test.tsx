import AlreadyResponded from "@/features/public-form/ui/already-responded";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../embed-already-responded-reporter", () => ({
  EmbedAlreadyRespondedReporter: ({
    formId,
    message,
  }: {
    formId: string;
    message: string;
  }) => (
    <div
      data-form-id={formId}
      data-message={message}
      data-testid="embed-already-responded-reporter"
    />
  ),
}));

describe("AlreadyResponded", () => {
  it("renders nested metadata title and message", () => {
    // Arrange
    const metadata = JSON.stringify({
      alreadyResponded: {
        title: "Custom heading",
        message: "A custom already-responded message.",
      },
    });

    // Act
    render(
      <AlreadyResponded
        formId="form-123"
        isEmbed={false}
        metadata={metadata}
      />,
    );

    // Assert
    expect(screen.getByText("Custom heading")).toBeDefined();
    expect(
      screen.getByText("A custom already-responded message."),
    ).toBeDefined();
  });

  it("renders default title when only message is provided", () => {
    // Arrange
    const metadata = JSON.stringify({
      alreadyResponded: { message: "Message only custom value." },
    });

    // Act
    render(
      <AlreadyResponded
        formId="form-123"
        isEmbed={false}
        metadata={metadata}
      />,
    );

    // Assert
    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(screen.getByText("Message only custom value.")).toBeDefined();
  });

  it("falls back to default message for invalid metadata", () => {
    // Act
    render(
      <AlreadyResponded formId="form-123" isEmbed={false} metadata="null" />,
    );

    // Assert
    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(
      screen.getByText("You have already submitted a response for this form."),
    ).toBeDefined();
  });

  it("uses embed classes and reports already responded state in embed mode", () => {
    // Arrange
    const metadata = JSON.stringify({
      alreadyResponded: { message: "You already completed this survey." },
    });

    // Act
    const { container } = render(
      <AlreadyResponded isEmbed={true} formId="form-123" metadata={metadata} />,
    );

    // Assert
    expect(
      container.querySelector(".already-responded-container"),
    ).toBeDefined();
    expect(
      screen
        .getByTestId("embed-already-responded-reporter")
        .getAttribute("data-form-id"),
    ).toBe("form-123");
    expect(
      screen
        .getByTestId("embed-already-responded-reporter")
        .getAttribute("data-message"),
    ).toBe("You already completed this survey.");
  });
});

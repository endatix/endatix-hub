import { getEmbedMessagingContext } from "@/features/embed-form/ui/embed-messaging-context";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbedAlreadyRespondedReporter } from "../embed-already-responded-reporter";

vi.mock("@/features/embed-form/ui/embed-messaging-context", () => ({
  getEmbedMessagingContext: vi.fn(),
}));

describe("EmbedAlreadyRespondedReporter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts a form-error message for the already responded state", () => {
    // Arrange
    const postMessage = vi.fn();
    vi.mocked(getEmbedMessagingContext).mockReturnValue({
      embedId: "embed-123",
      parentOrigin: "https://host.example",
    });
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage,
    } as unknown as Window);

    // Act
    render(
      <EmbedAlreadyRespondedReporter
        formId="form-123"
        message="You already completed this survey."
      />,
    );

    // Assert
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "endatix:form-error",
        embedId: "embed-123",
        formId: "form-123",
        success: false,
        error: {
          type: "access",
          code: "already_responded",
          message: "You already completed this survey.",
        },
      },
      "https://host.example",
    );
  });

  it("does not post outside an embed context", () => {
    // Arrange
    const postMessage = vi.fn();
    vi.mocked(getEmbedMessagingContext).mockReturnValue({});
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage,
    } as unknown as Window);

    // Act
    render(
      <EmbedAlreadyRespondedReporter
        formId="form-123"
        message="You already completed this survey."
      />,
    );

    // Assert
    expect(postMessage).not.toHaveBeenCalled();
  });
});

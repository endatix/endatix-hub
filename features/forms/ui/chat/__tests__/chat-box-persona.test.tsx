import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatBox from "@/features/forms/ui/chat/chat-box";
import { BrandProvider } from "@/lib/branding/brand-provider";
import { packBrand } from "@/test/pack-brand";
import { renderWithBrand } from "@/test/render-with-brand";

vi.mock("@/features/forms/use-cases/design-form", () => ({
  useFormAssistant: () => ({ chatContext: undefined, sendPrompt: vi.fn() }),
}));

describe("ChatBox persona", () => {
  it("names the Endatix AI Assistant with no brand pack", () => {
    renderWithBrand(<ChatBox />);

    expect(
      screen.getByText(
        "Endatix AI Assistant may make mistakes. Please use with discretion.",
      ),
    ).toBeDefined();
  });

  it("names the pack's assistant", () => {
    render(
      <BrandProvider brand={packBrand({ personas: { assistant: "Ada" } })}>
        <ChatBox />
      </BrandProvider>,
    );

    expect(
      screen.getByText("Ada may make mistakes. Please use with discretion."),
    ).toBeDefined();
  });
});

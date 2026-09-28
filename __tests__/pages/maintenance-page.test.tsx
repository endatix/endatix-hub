import MaintenancePage from "@/app/(public)/maintenance/page";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

describe("MaintenancePage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it("maps operator copy onto the public status page", () => {
    // Arrange
    vi.stubEnv("MAINTENANCE_MODE", "true");
    vi.stubEnv("MAINTENANCE_BADGE_LABEL", "Down");
    vi.stubEnv("MAINTENANCE_TITLE", "Back at 14:00");
    vi.stubEnv("MAINTENANCE_CARD_DESCRIPTION", "Forms are paused.");
    vi.stubEnv("MAINTENANCE_BODY", "Your answers are safe.");
    vi.stubEnv("MAINTENANCE_FOOTER", "Thanks for waiting.");

    // Act
    render(<MaintenancePage />);

    // Assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Back at 14:00" }),
    ).toBeDefined();
    expect(screen.getByText("Forms are paused.")).toBeDefined();
    expect(screen.getByText("Your answers are safe.")).toBeDefined();
    expect(screen.getByText("Thanks for waiting.")).toBeDefined();
    // Deprecated: the public status page has no badge slot.
    expect(screen.queryByText("Down")).toBeNull();
  });

  it("is a 404 outside maintenance mode", () => {
    vi.stubEnv("MAINTENANCE_MODE", "false");

    expect(() => render(<MaintenancePage />)).toThrow("NEXT_NOT_FOUND");
  });
});

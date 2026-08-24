import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("search=cities&hasLocale=es"),
}));

import { CreateDataListButton } from "../create-data-list-button";

describe("CreateDataListButton", () => {
  it("preserves current list filters when opening the create dialog", () => {
    // Arrange & Act
    render(<CreateDataListButton />);

    // Assert
    const link = screen.getByRole("link", { name: /create list/i });
    expect(link.getAttribute("href")).toBe(
      "/data-lists?search=cities&hasLocale=es&action=create",
    );
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextLink } from "../text-link";

describe("TextLink", () => {
  it("opens an external link in a new tab and says so", () => {
    // Act
    render(
      <TextLink href="https://example.com/replay" external>
        Session replay
      </TextLink>,
    );

    // Assert
    const link = screen.getByRole("link", {
      name: /Session replay/,
    });
    expect(link.textContent).toBe("Session replay (opens in a new tab)");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps an internal link in the Hub", () => {
    // Act
    render(<TextLink href="/admin/tenants">Open in Tenants</TextLink>);

    // Assert
    const link = screen.getByRole("link", { name: "Open in Tenants" });
    expect(link.getAttribute("target")).toBeNull();
    expect(link.getAttribute("href")).toBe("/admin/tenants");
  });
});

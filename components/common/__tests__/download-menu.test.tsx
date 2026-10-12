import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadMenu } from "../download-menu";

describe("DownloadMenu", () => {
  it("is one button naming the format when there is one", () => {
    // Arrange
    const onSelect = vi.fn();
    render(
      <DownloadMenu pending={false} formats={[{ kind: "csv", onSelect }]} />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));

    // Assert
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("names the running download and refuses a second one", () => {
    render(
      <DownloadMenu
        pending
        formats={[
          { kind: "csv", onSelect: vi.fn() },
          { kind: "json", onSelect: vi.fn() },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Downloading/ });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
  });
});

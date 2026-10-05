import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionsFilterToolbar } from "../../../ui/filters/submissions-filter-toolbar";

describe("SubmissionsFilterToolbar", () => {
  it("renders submission type filter", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        collectionStatusFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
      />,
    );

    // Assert
    expect(screen.getByText("Submission Type")).toBeDefined();
  });

  it("shows reset button when test filter is active", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        collectionStatusFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set(["true"])}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
      />,
    );

    // Assert
    expect(
      screen.getByRole("button", { name: /reset filters/i }),
    ).toBeDefined();
  });

  it("disables filter controls and reset when disabled", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        collectionStatusFilter={new Set(["not_started"])}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
        disabled
      />,
    );

    // Assert
    expect(
      (screen.getByRole("button", { name: /^status/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /review/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /submission type/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /reset filters/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

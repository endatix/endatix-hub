import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SurveyDesignStatusBadge } from "../ui/survey-design-status-badge";

describe("SurveyDesignStatusBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseProps = {
    hasJsonErrors: false,
    isOnJsonTab: false,
    isJsonModified: false,
    hasUnsavedChanges: false,
  };

  it("renders nothing when NoChanges", () => {
    const { container } = render(<SurveyDesignStatusBadge {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Invalid JSON when hasJsonErrors", () => {
    render(<SurveyDesignStatusBadge {...baseProps} hasJsonErrors={true} />);
    expect(screen.getByText("Invalid JSON")).toBeDefined();
  });

  it("renders Json modified when isJsonModified and isOnJsonTab", () => {
    render(
      <SurveyDesignStatusBadge
        {...baseProps}
        isJsonModified={true}
        isOnJsonTab={true}
      />,
    );
    expect(screen.getByText("Json modified")).toBeDefined();
  });

  it("renders Unsaved changes when hasUnsavedChanges and not on JSON tab", () => {
    render(
      <SurveyDesignStatusBadge
        {...baseProps}
        hasUnsavedChanges={true}
        isOnJsonTab={false}
      />,
    );
    expect(screen.getByText("Unsaved changes")).toBeDefined();
  });

  it("renders Saving when isSaving", () => {
    render(<SurveyDesignStatusBadge {...baseProps} isSaving={true} />);
    expect(screen.getByText("Saving")).toBeDefined();
  });

  it("renders Saved when showSavedSuccess", () => {
    render(<SurveyDesignStatusBadge {...baseProps} showSavedSuccess={true} />);
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("calls onSavedSuccessDismiss after SAVED_SUCCESS_DURATION_MS when showSavedSuccess is true", () => {
    const onSavedSuccessDismiss = vi.fn();
    render(
      <SurveyDesignStatusBadge
        {...baseProps}
        showSavedSuccess={true}
        onSavedSuccessDismiss={onSavedSuccessDismiss}
      />,
    );
    expect(onSavedSuccessDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onSavedSuccessDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not set timer when onSavedSuccessDismiss is not provided", () => {
    render(<SurveyDesignStatusBadge {...baseProps} showSavedSuccess={true} />);
    expect(screen.getByText("Saved")).toBeDefined();
    vi.advanceTimersByTime(2000);
    // Still showing Saved (no dismiss callback to clear it)
    expect(screen.getByText("Saved")).toBeDefined();
  });
});

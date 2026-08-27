import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurveyDashboard } from "../survey-dashboard";

const mockRender = vi.fn();
const mockClear = vi.fn();
const mockApplyTheme = vi.fn();

vi.mock("survey-core", () => ({
  Model: vi.fn().mockImplementation(function () {
    return {
      getAllQuestions: vi.fn().mockReturnValue([]),
    };
  }),
}));

vi.mock("survey-analytics", () => ({
  Dashboard: vi.fn().mockImplementation(function () {
    return {
      applyTheme: mockApplyTheme,
      render: mockRender,
      clear: mockClear,
    };
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    state: "expanded",
    open: true,
    setOpen: vi.fn(),
    toggleSidebar: vi.fn(),
  }),
}));

describe("SurveyDashboard", () => {
  it("renders a container div", () => {
    const { container } = render(<SurveyDashboard surveyJson={null} />);
    const div = container.querySelector("div.w-full");
    expect(div).toBeDefined();
    expect(div?.className).toContain("min-h-[400px]");
  });

  it("renders then applies the Hub survey theme", async () => {
    mockRender.mockClear();
    mockApplyTheme.mockClear();
    const { container } = render(<SurveyDashboard surveyJson={null} />);
    expect(mockRender).toHaveBeenCalledWith(
      container.querySelector("div.w-full"),
    );
    await waitFor(() => expect(mockApplyTheme).toHaveBeenCalled());
    expect(mockRender.mock.invocationCallOrder[0]).toBeLessThan(
      mockApplyTheme.mock.invocationCallOrder[0],
    );
  });
});

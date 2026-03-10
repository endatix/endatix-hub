import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurveyDashboard } from "../survey-dashboard";

const mockRender = vi.fn();
const mockClear = vi.fn();

vi.mock("survey-core", () => ({
  Model: vi.fn().mockImplementation(function () {
    return {
      getAllQuestions: vi.fn().mockReturnValue([]),
    };
  }),
}));

vi.mock("survey-analytics", () => ({
  VisualizationPanel: vi.fn().mockImplementation(function () {
    return {
      render: mockRender,
      clear: mockClear,
    };
  }),
}));

describe("SurveyDashboard", () => {
  it("renders a container div", () => {
    const { container } = render(<SurveyDashboard surveyJson={null} />);
    const div = container.querySelector("div.w-full");
    expect(div).toBeDefined();
    expect(div?.className).toContain("min-h-[400px]");
  });

  it("calls VisualizationPanel render with container element", () => {
    mockRender.mockClear();
    const { container } = render(<SurveyDashboard surveyJson={null} />);
    expect(mockRender).toHaveBeenCalled();
    expect(mockRender.mock.calls[0][0]).toBe(
      container.querySelector("div.w-full"),
    );
  });
});

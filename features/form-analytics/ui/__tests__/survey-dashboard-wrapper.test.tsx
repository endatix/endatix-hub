import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurveyDashboardWrapper } from "../survey-dashboard-wrapper";

const MockDashboard = ({ surveyJson }: { surveyJson: object | null }) => (
  <div data-testid="survey-dashboard">
    {surveyJson == null ? "mock-data" : "custom"}
  </div>
);

vi.mock("next/dynamic", () => ({
  default: (_load: () => Promise<{ default: unknown }>, _options: unknown) =>
    function DynamicMock(props: { surveyJson: object | null }) {
      return <MockDashboard {...props} />;
    },
}));

describe("SurveyDashboardWrapper", () => {
  it("renders dashboard with null surveyJson", () => {
    const { getByTestId, getByText } = render(
      <SurveyDashboardWrapper surveyJson={null} />,
    );
    expect(getByTestId("survey-dashboard")).toBeDefined();
    expect(getByText("mock-data")).toBeDefined();
  });

  it("passes custom surveyJson to dashboard", () => {
    const customJson = { pages: [] };
    const { getByText } = render(
      <SurveyDashboardWrapper surveyJson={customJson} />,
    );
    expect(getByText("custom")).toBeDefined();
  });
});

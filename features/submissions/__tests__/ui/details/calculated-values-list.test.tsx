import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import CalculatedValuesList from "../../../ui/details/calculated-values-list";
import { SubmissionDetailsViewOptionsProvider } from "../../../ui/details/submission-details-view-options-context";

vi.mock(
  "@/features/public-form/application/use-dynamic-variables.hook",
  () => ({
    useDynamicVariables: vi.fn(() => ({ variables: {} })),
  }),
);

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <SubmissionDetailsViewOptionsProvider>
      {ui}
    </SubmissionDetailsViewOptionsProvider>,
  );
};

describe("CalculatedValuesList", () => {
  let model: SurveyModel;

  const surveyJsonWithCalculatedValues = {
    elements: [
      {
        type: "text",
        name: "utmSource",
      },
      {
        type: "text",
        name: "utmroute",
      },
      {
        type: "text",
        name: "utmCampaign",
      },
    ],
    calculatedValues: [
      {
        name: "utmSource",
        expression: "{utmSource}",
        includeIntoResult: true,
      },
      {
        name: "utmRoute",
        expression: "{utmroute}",
        includeIntoResult: true,
      },
      {
        name: "utmCampaign",
        includeIntoResult: false,
      },
    ],
  };

  beforeEach(() => {
    model = new SurveyModel(surveyJsonWithCalculatedValues);
    model.setVariable("utmSource", "google");
    model.setVariable("utmroute", "home");
    model.setVariable("utmCampaign", "spring_sale");
  });

  describe("Rendering", () => {
    it("should render calculated values section", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText("Calculated Values")).toBeDefined();
    });

    it("should display all calculated values from the survey model", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText(/utmSource =/)).toBeDefined();
      expect(screen.getByText(/utmRoute =/)).toBeDefined();
      expect(screen.getByText(/utmCampaign =/)).toBeDefined();
    });
  });

  describe("includeIntoResult handling", () => {
    it("should show 'In result' badge for calculated values with includeIntoResult: true", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      const inResultBadges = screen.getAllByText("In result");
      expect(inResultBadges).toHaveLength(2);
    });

    it("should show 'Not in result' badge for calculated values with includeIntoResult: false", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText("Not in result")).toBeDefined();
    });

    it("should handle mixed case names (pascalCase, camelCase)", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText(/utmSource/)).toBeDefined();
      expect(screen.getByText(/utmRoute/)).toBeDefined();
    });
  });

  describe("Expression display", () => {
    it("should have copy buttons for calculated values with expression", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      const copyButtons = screen.getAllByLabelText("Copy expression");
      expect(copyButtons).toHaveLength(3);
    });
  });

  describe("Empty states", () => {
    it("should return null when calculatedValues is empty", () => {
      const modelWithoutCalculatedValues = new SurveyModel({
        elements: [{ type: "text", name: "question1" }],
      });

      const { container } = renderWithContext(
        <CalculatedValuesList surveyModel={modelWithoutCalculatedValues} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should return null when showCalculatedValues is false", () => {
      const TestComponent = () => {
        return (
          <SubmissionDetailsViewOptionsProvider>
            <CalculatedValuesList surveyModel={model} />
          </SubmissionDetailsViewOptionsProvider>
        );
      };

      vi.doMock("../submission-details-view-options-context", async () => {
        const actual = await vi.importActual(
          "../submission-details-view-options-context",
        );
        return {
          ...actual,
          useSubmissionDetailsViewOptions: () => ({
            options: {
              showCalculatedValues: false,
              showDynamicVariables: true,
              showInvisibleItems: true,
              useSubmissionLanguage: true,
            },
          }),
        };
      });
    });
  });

  describe("Case sensitivity", () => {
    it("should handle lowercase calculated value names", () => {
      const modelWithLowercase = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "lowercasevar",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithLowercase.setValue("lowercasevar", "test_value");

      renderWithContext(
        <CalculatedValuesList surveyModel={modelWithLowercase} />,
      );

      expect(screen.getByText(/lowercasevar =/)).toBeDefined();
    });

    it("should handle uppercase calculated value names", () => {
      const modelWithUppercase = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "UPPERCASEVAR",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithUppercase.setValue("UPPERCASEVAR", "test_value");

      renderWithContext(
        <CalculatedValuesList surveyModel={modelWithUppercase} />,
      );

      expect(screen.getByText(/UPPERCASEVAR =/)).toBeDefined();
    });
  });
});

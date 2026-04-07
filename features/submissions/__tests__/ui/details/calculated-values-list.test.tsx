import { render, screen } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import { beforeEach, describe, expect, it } from "vitest";
import CalculatedValuesList from "../../../ui/details/calculated-values-list";

const renderWithContext = (ui: React.ReactElement) => {
  return render(ui);
};

describe("CalculatedValuesListComponent", () => {
  let model: SurveyModel;

  const surveyJsonWithCalculatedValues = {
    elements: [{ type: "text", name: "source" }],
    calculatedValues: [
      {
        name: "computedField",
        expression: "{source}",
        includeIntoResult: true,
      },
      { name: "hiddenField", expression: "{source}", includeIntoResult: false },
    ],
  };

  beforeEach(() => {
    model = new SurveyModel(surveyJsonWithCalculatedValues);
    model.setVariable("computedField", "test_value");
    model.setVariable("hiddenField", "hidden_value");
  });

  describe("Empty state", () => {
    it("should render empty state when surveyModel is null", () => {
      const { container } = renderWithContext(
        <CalculatedValuesList surveyModel={null} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render empty state when no calculated values", () => {
      const modelWithoutCalculatedValues = new SurveyModel({
        elements: [{ type: "text", name: "question1" }],
      });

      renderWithContext(
        <CalculatedValuesList surveyModel={modelWithoutCalculatedValues} />,
      );

      expect(screen.getByText("No calculated values")).toBeDefined();
    });
  });

  describe("Calculated values table rendering", () => {
    it("should render calculated values section when values exist", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText("Calculated Values")).toBeDefined();
    });

    it("should display all calculated value names", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText("computedField")).toBeDefined();
      expect(screen.getByText("hiddenField")).toBeDefined();
    });
  });

  describe("includeIntoResult badge", () => {
    it("should show 'In result' badge for includeIntoResult: true", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText("In result")).toBeDefined();
    });

    it("should show 'Not in result' badge for includeIntoResult: false", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getByText("Not in result")).toBeDefined();
    });

    it("should show correct number of badges", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      expect(screen.getAllByText("In result")).toHaveLength(1);
      expect(screen.getAllByText("Not in result")).toHaveLength(1);
    });
  });

  describe("Expression handling", () => {
    it("should render copy button for values with expression", () => {
      renderWithContext(<CalculatedValuesList surveyModel={model} />);

      const copyButtons = document.querySelectorAll(
        'button[aria-label="Copy to clipboard"]',
      );
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it("should handle calculated value without expression", () => {
      const modelWithoutExpression = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [{ name: "noExpression", includeIntoResult: true }],
      });
      modelWithoutExpression.setVariable("noExpression", "value");

      renderWithContext(
        <CalculatedValuesList surveyModel={modelWithoutExpression} />,
      );

      expect(screen.getByText("noExpression")).toBeDefined();
    });
  });
});

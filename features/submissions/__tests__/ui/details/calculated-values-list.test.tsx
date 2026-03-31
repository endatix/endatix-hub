import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import CalculatedValuesList from "../../../ui/details/calculated-values-list";

vi.mock(
  "@/features/public-form/application/use-dynamic-variables.hook",
  () => ({
    useDynamicVariables: vi.fn(() => ({ variables: {} })),
  }),
);

const renderWithContext = (ui: React.ReactElement) => {
  return render(ui);
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
      modelWithLowercase.setVariable("lowercasevar", "test_value");

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
      modelWithUppercase.setVariable("UPPERCASEVAR", "test_value");

      renderWithContext(
        <CalculatedValuesList surveyModel={modelWithUppercase} />,
      );

      expect(screen.getByText(/UPPERCASEVAR =/)).toBeDefined();
    });
  });

  describe("Value type formatting", () => {
    it("should handle string values in formatValue", () => {
      const modelWithString = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "stringValue",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithString.setVariable("stringValue", "hello world");

      renderWithContext(<CalculatedValuesList surveyModel={modelWithString} />);

      expect(screen.getByText(/stringValue =/)).toBeDefined();
    });

    it("should handle number values in formatValue", () => {
      const modelWithNumber = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "numberValue",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithNumber.setVariable("numberValue", 42);

      renderWithContext(<CalculatedValuesList surveyModel={modelWithNumber} />);

      expect(screen.getByText(/numberValue =/)).toBeDefined();
    });

    it("should handle boolean values in formatValue", () => {
      const modelWithBoolean = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "boolValue",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithBoolean.setVariable("boolValue", true);

      renderWithContext(
        <CalculatedValuesList surveyModel={modelWithBoolean} />,
      );

      expect(screen.getByText(/boolValue =/)).toBeDefined();
    });

    it("should handle array values in formatValue", () => {
      const modelWithArray = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "arrayValue",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithArray.setVariable("arrayValue", [1, 2, 3]);

      renderWithContext(<CalculatedValuesList surveyModel={modelWithArray} />);

      expect(screen.getByText(/arrayValue =/)).toBeDefined();
    });

    it("should handle object values in formatValue", () => {
      const modelWithObject = new SurveyModel({
        elements: [{ type: "text", name: "test" }],
        calculatedValues: [
          {
            name: "objectValue",
            expression: "{test}",
            includeIntoResult: true,
          },
        ],
      });
      modelWithObject.setVariable("objectValue", { key1: "value1" });

      renderWithContext(<CalculatedValuesList surveyModel={modelWithObject} />);

      expect(screen.getByText(/objectValue =/)).toBeDefined();
    });
  });
});

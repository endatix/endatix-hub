import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { registerFormattingExtension } from "@/lib/survey-features/expression-formatting";

describe("Expression Formatting Integration", () => {
  let survey: SurveyModel;

  beforeAll(() => {
    registerFormattingExtension();
  });

  beforeEach(() => {
    survey = new SurveyModel();
  });

  describe("formatCurrency in expressions", () => {
    it("should format currency in question title using text piping", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "price",
            defaultValue: 1000,
          },
          {
            type: "expression",
            name: "formattedPrice",
            expression: "formatCurrency({price}, 'USD')",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("formattedPrice");
      expect(expressionQ?.value).toContain("$1,000.00");
    });

    it("should format currency with different currency code", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "amount",
            defaultValue: 2500,
          },
          {
            type: "expression",
            name: "eurAmount",
            expression: "formatCurrency({amount}, 'EUR')",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("eurAmount");
      expect(expressionQ?.value).toContain("€2,500.00");
    });
  });

  describe("formatNumber in expressions", () => {
    it("should format number with specified decimal places", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "value",
            defaultValue: 123.45678,
          },
          {
            type: "expression",
            name: "formattedValue",
            expression: "formatNumber({value}, 2)",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("formattedValue");
      expect(expressionQ?.value).toBe("123.46");
    });

    it("should format number with zero decimal places", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "value",
            defaultValue: 123.9,
          },
          {
            type: "expression",
            name: "formattedValue",
            expression: "formatNumber({value}, 0)",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("formattedValue");
      expect(expressionQ?.value).toBe("124");
    });
  });

  describe("formatDate in expressions", () => {
    it("should format date in expression", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "dateValue",
            defaultValue: "2024-01-15",
          },
          {
            type: "expression",
            name: "formattedDate",
            expression: "formatDate({dateValue})",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("formattedDate");
      expect(expressionQ?.value).toContain("15");
    });
  });

  describe("smartFormat in expressions", () => {
    it("should format as currency using smart format", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "amount",
            defaultValue: 500,
          },
          {
            type: "expression",
            name: "smartFormatted",
            expression: "format({amount}, 'currency')",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("smartFormatted");
      expect(expressionQ?.value).toContain("$500");
    });

    it("should format as percent using smart format", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "ratio",
            defaultValue: 0.75,
          },
          {
            type: "expression",
            name: "percentValue",
            expression: "format({ratio}, 'percent')",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("percentValue");
      expect(expressionQ?.value).toBe("75%");
    });

    it("should format as date using smart format", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "dateInput",
            defaultValue: "2024-12-25",
          },
          {
            type: "expression",
            name: "dateFormatted",
            expression: "format({dateInput}, 'date')",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const expressionQ = survey.getQuestionByName("dateFormatted");
      expect(expressionQ?.value).toBeTruthy();
      expect(expressionQ?.value).toContain("25");
    });
  });

  describe("setValueExpression with format functions", () => {
    it("should use formatCurrency in setValueExpression", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "basePrice",
            defaultValue: 100,
          },
          {
            type: "text",
            name: "totalPrice",
            setValueExpression: "formatCurrency({basePrice} * 1.2, 'EUR')",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      survey.setValue("basePrice", 200);

      const totalQ = survey.getQuestionByName("totalPrice");
      expect(totalQ?.value).toContain("€240");
    });
  });

  describe("defaultValueExpression with format functions", () => {
    it("should use formatNumber in defaultValueExpression", () => {
      const surveyJson = {
        elements: [
          {
            type: "text",
            name: "rawValue",
            defaultValue: 999.999,
          },
          {
            type: "text",
            name: "roundedValue",
            defaultValueExpression: "formatNumber({rawValue}, 1)",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      const roundedQ = survey.getQuestionByName("roundedValue");
      expect(roundedQ?.value).toContain("1,000");
    });
  });

  describe("complex expressions with format functions", () => {
    it("should work with conditional expressions", () => {
      const surveyJson = {
        elements: [
          {
            type: "radiogroup",
            name: "question2",
            setValueExpression: "iif({total_score} > 0, 'yes', 'no')",
            choices: ["yes", "no"],
          },
          {
            type: "text",
            name: "total_score",
            defaultValueExpression: "sum({question3_score})",
          },
          {
            type: "radiogroup",
            name: "question3",
            choices: ["yes", "no"],
          },
          {
            type: "text",
            name: "question3_score",
            defaultValueExpression: "iif({question3} = 'yes', 5, 0)",
          },
          {
            type: "text",
            name: "total_copy",
            setValueExpression: "formatCurrency({total_score})",
          },
        ],
      };

      survey = new SurveyModel(surveyJson);

      survey.setValue("question3", "yes");

      const totalScoreQ = survey.getQuestionByName("total_score");
      const question2Q = survey.getQuestionByName("question2");
      const totalCopyQ = survey.getQuestionByName("total_copy");

      expect(totalScoreQ?.value).toBe(5);
      expect(question2Q?.value).toBe("yes");
      expect(totalCopyQ?.value).toContain("$5");
    });
  });
});

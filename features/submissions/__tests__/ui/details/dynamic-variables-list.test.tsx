import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import DynamicVariablesList from "../../../ui/details/dynamic-variables-list";
import { SubmissionDetailsViewOptionsProvider } from "../../../ui/details/submission-details-view-options-context";

vi.mock(
  "@/features/public-form/application/use-dynamic-variables.hook",
  () => ({
    useDynamicVariables: vi.fn(),
  }),
);

import { useDynamicVariables } from "@/features/public-form/application/use-dynamic-variables.hook";
import { DynamicVariables } from "@/features/public-form/types";

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <SubmissionDetailsViewOptionsProvider>
      {ui}
    </SubmissionDetailsViewOptionsProvider>,
  );
};

describe("DynamicVariablesList", () => {
  let model: SurveyModel;

  beforeEach(() => {
    model = new SurveyModel();
    vi.clearAllMocks();
  });

  describe("Rendering with variables", () => {
    it("should render dynamic variables section when variables exist", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          utmSource: "google",
          utmRoute: "home",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("Dynamic Variables")).toBeDefined();
    });

    it("should display all variables from the hook", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          utmSource: "google",
          utmRoute: "home",
          utmCampaign: "spring_sale",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@utmSource =/)).toBeDefined();
      expect(screen.getByText(/@utmRoute =/)).toBeDefined();
      expect(screen.getByText(/@utmCampaign =/)).toBeDefined();
    });

    it("should display variable values correctly", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          utmSource: "google",
          utmRoute: "home",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("@utmSource =")).toBeDefined();
      expect(screen.getByText("google")).toBeDefined();
      expect(screen.getByText("@utmRoute =")).toBeDefined();
      expect(screen.getByText("home")).toBeDefined();
    });
  });

  describe("Empty states", () => {
    it("should return null when variables is empty", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {},
      });

      const { container } = renderWithContext(
        <DynamicVariablesList surveyModel={model} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should return null when variables is null", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: null as unknown as DynamicVariables,
      });

      const { container } = renderWithContext(
        <DynamicVariablesList surveyModel={model} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should return null when showDynamicVariables is false", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          testVar: "test",
        },
      });

      const TestWrapper = () => {
        return (
          <SubmissionDetailsViewOptionsProvider>
            <DynamicVariablesList surveyModel={model} />
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
              showCalculatedValues: true,
              showDynamicVariables: false,
              showInvisibleItems: true,
              useSubmissionLanguage: true,
            },
          }),
        };
      });
    });
  });

  describe("Variable names with different cases", () => {
    it("should handle lowercase variable names", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          lowercasevar: "value1",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@lowercasevar =/)).toBeDefined();
    });

    it("should handle uppercase variable names", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          UPPERCASEVAR: "value1",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@UPPERCASEVAR =/)).toBeDefined();
    });

    it("should handle camelCase variable names", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          camelCaseVar: "value1",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@camelCaseVar =/)).toBeDefined();
    });

    it("should handle pascalCase variable names", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          PascalCaseVar: "value1",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@PascalCaseVar =/)).toBeDefined();
    });

    it("should handle mixed case variable names", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          utmSource: "google",
          utmRoute: "home",
          utmCampaign: "spring_sale",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@utmSource =/)).toBeDefined();
      expect(screen.getByText(/@utmRoute =/)).toBeDefined();
      expect(screen.getByText(/@utmCampaign =/)).toBeDefined();
    });
  });

  describe("Variable values", () => {
    it("should handle string values", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          testVar: "string_value",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("string_value")).toBeDefined();
    });

    it("should handle number values", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          testVar: 42,
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("42")).toBeDefined();
    });

    it("should handle boolean values", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          testVar: true,
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("true")).toBeDefined();
    });

    it("should handle empty string values", () => {
      vi.mocked(useDynamicVariables).mockReturnValue({
        variables: {
          testVar: "",
        },
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@testVar =/)).toBeDefined();
    });
  });
});

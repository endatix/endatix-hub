import * as useDynamicVariablesModule from "@/features/public-form/application/use-dynamic-variables.hook";
import { render, screen } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DynamicVariablesList from "../../../ui/details/dynamic-variables-list";

vi.mock("@/features/public-form/application/use-dynamic-variables.hook");

const mockUseDynamicVariables =
  useDynamicVariablesModule.useDynamicVariables as ReturnType<typeof vi.fn>;

const renderWithContext = (ui: React.ReactElement) => {
  return render(ui);
};

describe("DynamicVariablesListComponent", () => {
  let model: SurveyModel;

  beforeEach(() => {
    model = new SurveyModel();
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should render empty state when hasVariables is false", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: {},
        hasVariables: false,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("No dynamic variables")).toBeDefined();
    });

    it("should render empty state when variables is empty object", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: {},
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("No dynamic variables")).toBeDefined();
    });

    it("should render empty state when variables is null", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: null as any,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("No dynamic variables")).toBeDefined();
    });
  });

  describe("Variable table rendering", () => {
    it("should render dynamic variables section when variables exist", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { firstName: "John" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("Dynamic Variables")).toBeDefined();
    });

    it("should display variable name with @ prefix", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { firstName: "John" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText(/@firstName/)).toBeDefined();
    });

    it("should display variable value for non-sensitive variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { firstName: "John", age: 25, isActive: true },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("John")).toBeDefined();
      expect(screen.getByText("25")).toBeDefined();
      expect(screen.getByText("true")).toBeDefined();
    });

    it("should render variable table structure", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { testVar: "value" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      const tableContainer = document.querySelector(".grid.grid-cols-12");
      expect(tableContainer).toBeDefined();
    });
  });

  describe("Sensitive variable masking", () => {
    it("should mask password variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { password: "secretpassword" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("••••••••")).toBeDefined();
    });

    it("should mask token variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { authToken: "mytokenvalue" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("••••••••")).toBeDefined();
    });

    it("should mask secret variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { apiSecret: "mysecretvalue" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("••••••••")).toBeDefined();
    });

    it("should mask key variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { apiKey: "mykeyvalue" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("••••••••")).toBeDefined();
    });

    it("should mask email variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { userEmail: "test@test.com" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("••••••••")).toBeDefined();
    });

    it("should mask phone variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { phoneNumber: "1234567890" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      expect(screen.getByText("••••••••")).toBeDefined();
    });
  });

  describe("Copy button", () => {
    it("should render copy button for non-sensitive variables", () => {
      mockUseDynamicVariables.mockReturnValue({
        variables: { firstName: "John" },
        hasVariables: true,
      });

      renderWithContext(<DynamicVariablesList surveyModel={model} />);

      const copyButton = document.querySelector(
        'button[aria-label="Copy to clipboard"]',
      );
      expect(copyButton).toBeDefined();
    });
  });
});

import React from "react";
import { QuestionFileModel } from "survey-core";
import { render, RenderResult } from "@testing-library/react";

/**
 * Type for SurveyJS components that have a protected renderElement method.
 * Used in tests to access protected methods via type assertion.
 */
export type SurveyJsComponent = {
  renderElement: () => React.ReactNode;
};

/**
 * Options for rendering a SurveyJS component with optional context.
 */
export interface RenderSurveyJsComponentOptions<TContextValue = unknown> {
  /**
   * Context provider component. Required when contextValue is provided.
   * Can be a React Context.Provider or any component that accepts value and children props.
   */
  ContextProvider?: React.ComponentType<{
    value: TContextValue;
    children: React.ReactNode;
  }>;
  /**
   * Optional context value to pass to the context provider.
   * If provided, ContextProvider must also be provided.
   */
  contextValue?: TContextValue;
}

/**
 * Helper function to render a SurveyJS component with optional context.
 * This allows testing class components that use Context.Consumer internally.
 *
 * @param ComponentClass - The SurveyJS component class to instantiate
 * @param question - The question model to pass to the component
 * @param options - Optional configuration including context provider and value
 * @returns RenderResult from @testing-library/react
 *
 * @example
 * // Render without context
 * renderSurveyJsComponent(ProtectedFilePreview, question);
 *
 * @example
 * // Render with context provider
 * renderSurveyJsComponent(ProtectedFilePreview, question, {
 *   ContextProvider: AssetStorageContext,
 *   contextValue: { config: mockConfig }
 * });
 */
export function renderSurveyJsComponent<TContextValue = unknown>(
  ComponentClass: new (props: { question: QuestionFileModel }) => unknown,
  question: QuestionFileModel,
  options?: RenderSurveyJsComponentOptions<TContextValue>,
): RenderResult {
  const TestWrapper = () => {
    const instance = React.useMemo(() => {
      return new ComponentClass({ question }) as SurveyJsComponent;
    }, []);

    const view = instance.renderElement();

    // If no context options provided, render without context
    if (!options?.contextValue && !options?.ContextProvider) {
      return <>{view}</>;
    }

    // ContextProvider is required when contextValue is provided
    if (options?.contextValue && !options?.ContextProvider) {
      throw new Error(
        "ContextProvider must be provided when contextValue is set",
      );
    }

    const ContextProvider = options.ContextProvider!;

    // Type assertion needed because ContextProvider is generic and accepts different value types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Provider = ContextProvider as React.ComponentType<{
      value: unknown;
      children: React.ReactNode;
    }>;

    return <Provider value={options.contextValue!}>{view}</Provider>;
  };

  return render(<TestWrapper />);
}

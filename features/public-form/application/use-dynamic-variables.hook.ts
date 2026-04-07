import { useEffect, useMemo, useState } from "react";
import { SurveyModel } from "survey-react-ui";
import { DynamicVariables, MetadataSchema } from "../types";

/**
 * Pure function to apply variables from metadata to a SurveyJS model.
 * To be used during model initialization phase before the model is rendered
 *
 * @param model The SurveyModel instance to update.
 * @param metadata The JSON string containing metadata variables.
 */
export const applyVariablesToModel = (model: SurveyModel, metadata: string) => {
  if (!metadata) {
    return;
  }

  try {
    const parsedMetadata = JSON.parse(metadata);
    const result = MetadataSchema.safeParse(parsedMetadata);
    if (!result.success) {
      return;
    }
    const variables = result.data?.variables || {};
    Object.entries(variables).forEach(([key, value]) => {
      model.setVariable(key, value);
    });
  } catch (error) {
    console.error("Invalid variables in metadata:", error);
  }
};

/**
 * Result of the useDynamicVariables hook.
 */
interface UseDynamicVariablesResult {
  variables: DynamicVariables;
  hasVariables: boolean;
}

/**
 * Reactive hook to observe variables in a SurveyJS model.
 * Use this in your component to get the current state of variables.
 *
 * @param model The SurveyModel instance to observe.
 * @returns Object containing the current variables state and a boolean indicating if there are any variables.
 */
export const useDynamicVariables = (
  model: SurveyModel | null,
): UseDynamicVariablesResult => {
  const [variables, setVariables] = useState<DynamicVariables>({});

  const hasVariables = useMemo(() => {
    return variables && Object.keys(variables).length > 0;
  }, [variables]);

  useEffect(() => {
    if (!model) {
      setVariables({});
      return;
    }

    const updateVariablesState = (sender: SurveyModel) => {
      const currentVars: DynamicVariables = {};
      sender.getVariableNames().forEach((name) => {
        currentVars[name] = sender.getVariable(name);
      });
      setVariables(currentVars);
    };

    updateVariablesState(model);

    model.onVariableChanged.add(updateVariablesState);

    return () => {
      model.onVariableChanged.remove(updateVariablesState);
    };
  }, [model]);

  return {
    variables,
    hasVariables,
  };
};

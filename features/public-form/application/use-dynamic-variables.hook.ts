import { useCallback, useEffect, useState } from "react";
import { DynamicVariables, MetadataSchema } from "../types";
import { SurveyModel } from "survey-react-ui";

export const useDynamicVariables = (model: SurveyModel | null) => {
  const [variablesState, setVariablesState] = useState<DynamicVariables>({});

  const setVariables = useCallback(
    (vars: DynamicVariables) => {
      if (!model) {
        return;
      }

      Object.entries(vars).forEach(([key, value]) => {
        model.setVariable(key, value);
      });
      setVariablesState(vars);
    },
    [model],
  );

  useEffect(() => {
    if (!model) {
      return;
    }

    const surveyVariableChanged = (sender: SurveyModel) => {
      const variables: DynamicVariables = {};
      sender.getVariableNames().forEach((name) => {
        variables[name] = sender.getVariable(name);
      });
      setVariablesState(variables);
    };

    model.onVariableChanged.add(surveyVariableChanged);

    return () => {
      model.onVariableChanged.remove(surveyVariableChanged);
    };
  }, [model]);

  const setFromMetadata = useCallback(
    (metadata: string) => {
      if (!metadata) {
        return;
      }

      try {
        const parsedMetadata = JSON.parse(metadata);
        const result = MetadataSchema.safeParse(parsedMetadata);
        if (!result.success) {
          return;
        }
        const variables = result.data.variables;
        setVariables(variables);
      } catch (error) {
        console.error("Invalid initial variables:", error);
      }
    },
    [setVariables],
  );

  const clearVars = useCallback(() => {
    setVariables({});
  }, [setVariables]);

  return {
    variables: variablesState,
    setFromMetadata,
    clearVars,
  };
};

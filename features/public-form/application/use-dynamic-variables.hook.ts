import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SurveyModel } from "survey-react-ui";
import { useSubmissionQueue } from "./submission-queue";
import { SubmissionData } from "./actions/submit-form.action";

export type DynamicVariable = string | number | boolean | object | undefined;

export const useDynamicVariables = (
  model: SurveyModel,
  formId: string,
  onChange?: (vars: Record<string, DynamicVariable>) => void,
) => {
  const searchParams = useSearchParams();
  const { enqueueSubmission } = useSubmissionQueue(formId);
  const [variables, setVariables] = useState<Record<string, DynamicVariable>>(
    {},
  );

  const onVariableChanged = useCallback(
    (vars: Record<string, DynamicVariable>) => {
      setVariables(vars);

      if (onChange) {
        onChange(vars);
      }

      const submissionData: SubmissionData = {
        metadata: JSON.stringify({
          variables: vars,
        }),
      };

      enqueueSubmission(submissionData);
    },
    [onChange, enqueueSubmission],
  );

  useEffect(() => {
    const initialVars: Record<string, string> = {};
    const variablesChangedHandler = (sender: SurveyModel) => {
      const variables: Record<string, DynamicVariable> = {};
      sender.getVariableNames().forEach((name) => {
        variables[name] = sender.getVariable(name);
      });
      onVariableChanged(variables);
    };

    searchParams?.forEach((value, key) => {
      initialVars[key] = value;
      model.setVariable(key, value);
    });

    onVariableChanged(initialVars);
    model.onVariableChanged.add(variablesChangedHandler);

    return () => {
      model.onVariableChanged.remove(variablesChangedHandler);
    };
  }, [model, searchParams, onVariableChanged]);

  return { variables };
};

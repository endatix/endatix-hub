export type PersonalizationVariables = {
  variables?: Record<string, unknown> | null;
} | null;

type DefaultQuestion = {
  defaultValueExpression?: string;
  isEmpty: () => boolean;
  runDefaultValueExpression: () => void;
};

type VariableTarget = {
  setVariable: (name: string, value: unknown) => void;
};

/**
 * `runDefaultValueExpression` exists on SurveyJS questions but is protected, so the
 * public model type cannot declare it. The cast stays inside this helper.
 */
type ModelWithDefaults = VariableTarget & {
  getAllQuestions?: () => DefaultQuestion[];
};

/** Frozen audience values. Call after metadata and URL variables so these win. */
export function applyPersonalizationToModel(
  model: VariableTarget,
  personalization: PersonalizationVariables | undefined,
): void {
  const variables = personalization?.variables;
  if (!variables) {
    return;
  }

  for (const [name, value] of Object.entries(variables)) {
    model.setVariable(name, value);
  }
  // A calculated default is evaluated once, before these variables exist.
  const questions = (model as ModelWithDefaults).getAllQuestions?.() ?? [];
  for (const question of questions) {
    if (question.defaultValueExpression && question.isEmpty()) {
      question.runDefaultValueExpression();
    }
  }
}

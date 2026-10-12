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
  for (const question of model.getAllQuestions?.() ?? []) {
    if (question.defaultValueExpression && question.isEmpty()) {
      question.runDefaultValueExpression();
    }
  }
}

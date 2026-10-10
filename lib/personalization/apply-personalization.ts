export type PersonalizationVariables = {
  variables?: Record<string, unknown> | null;
} | null;

type VariableTarget = {
  setVariable: (name: string, value: unknown) => void;
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
}

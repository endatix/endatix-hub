// Shared by the Test participant values editor and save tests.
import { vi } from "vitest";
import type { ISurveyVariablePreset } from "survey-core";
import { SurveyCreatorModel, type TabTestPlugin } from "survey-creator-core";
import {
  AudienceIdentifierKind,
  type AudienceVariablePreset,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { type BoundAudience, bindAudienceToCreator } from "..";

export const MARIA = "maria@acme.test";
export const BOB = "bob@acme.test";
export const ANA = "ana@acme.test";

const FORM_JSON = {
  elements: [{ type: "text", name: "plan", title: "Your plan is {tier}" }],
};

export function variables(
  presets: AudienceVariablePreset[] = [
    { name: MARIA, variables: { tier: "gold" } },
    { name: BOB, variables: { tier: "silver" } },
  ],
  readOnlyPresets: string[] = [BOB],
): AudienceVariables {
  return {
    variablePresets: {
      definition: { elements: [{ type: "text", name: "tier" }] },
      presets,
      totalPresets: presets.length,
    },
    coverage: { participants: { test: 1, real: 1 }, properties: [] },
    editing: { allowAdd: true, allowEdit: true, allowDelete: false },
    readOnlyPresets,
  };
}

export type Save = NonNullable<BoundAudience["testParticipants"]>["save"];

export function designer() {
  const creator = new SurveyCreatorModel({ showPreview: true });
  creator.JSON = FORM_JSON;
  return creator;
}

export function bind(
  creator: SurveyCreatorModel,
  overrides: Partial<BoundAudience> & { save?: Save } = {},
) {
  const { save, ...rest } = overrides;
  return bindAudienceToCreator(creator, {
    variables: variables(),
    refresh: () => Promise.resolve(Result.success(variables())),
    testParticipants: {
      identifierKind: AudienceIdentifierKind.Email,
      save:
        save ?? vi.fn<Save>(() => Promise.resolve(Result.success(variables()))),
    },
    ...rest,
  });
}

export function presetManager(creator: SurveyCreatorModel) {
  return (creator.getPlugin("preview") as TabTestPlugin).variablePresets;
}

export function operations(creator: SurveyCreatorModel, name: string) {
  const preset = creator.variablePresets.presets?.find((p) => p.name === name);
  return presetManager(creator).getPresetOperations(
    preset as ISurveyVariablePreset,
  );
}

/** What the editor's Apply does: the whole edited list back into the container. */
export function applyEdit(
  creator: SurveyCreatorModel,
  edit: (presets: ISurveyVariablePreset[]) => ISurveyVariablePreset[],
) {
  const presets = structuredClone(creator.variablePresets.presets ?? []);
  presetManager(creator).setPresets(edit(presets));
}

export function withTier(name: string, tier: string) {
  return (presets: ISurveyVariablePreset[]) =>
    presets.map((p) => (p.name === name ? { ...p, variables: { tier } } : p));
}

export const names = (creator: SurveyCreatorModel) =>
  creator.variablePresets.presets?.map((p) => p.name);

export const tierOf = (creator: SurveyCreatorModel, name: string) =>
  creator.variablePresets.presets?.find((p) => p.name === name)?.variables
    ?.tier;

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

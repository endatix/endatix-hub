import type { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import {
  bindToCreator,
  type CreatorBinding,
  type CreatorHooks,
} from "./creator-binding";

export type { CreatorBinding, CreatorHooks };

/** The form's Audience variables, as the designer authors with them. */
export interface AudienceAuthoring {
  /** Preview as: None or a Test participant in the Creator's Preview tab. */
  bindToCreator(
    creator: SurveyCreatorModel,
    hooks: CreatorHooks,
  ): CreatorBinding;
}

/** `null` when there are no variables or the form has no Properties (Q10). */
export function createAudienceAuthoring(
  variables: AudienceVariables | null,
): AudienceAuthoring | null {
  if (!variables?.variablePresets) return null;
  return {
    bindToCreator: (creator, hooks) => bindToCreator(creator, variables, hooks),
  };
}

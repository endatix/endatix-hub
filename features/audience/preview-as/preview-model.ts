import { Model } from "survey-core";
import { applyPersonalizationToModel } from "@/lib/personalization/apply-personalization";

/**
 * The saved form as this participant gets it: their values go in through the shared form's own
 * `applyPersonalizationToModel`. A preview is never a response, so it cannot be completed.
 */
export function previewAsModel(
  definition: object,
  variables: Record<string, unknown>,
): Model {
  const model = new Model(definition);
  applyPersonalizationToModel(model, { variables });
  model.showCompleteButton = false;
  model.showCompletedPage = false;
  model.onCompleting.add((_, options) => {
    options.allow = false;
  });
  return model;
}

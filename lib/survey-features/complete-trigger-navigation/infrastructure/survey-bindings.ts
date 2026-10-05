import { Model } from "survey-core";
import { CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY } from "../constants";
import { readChangeNavigationButtonsOnComplete } from "../use-cases/read-change-navigation-buttons-on-complete";

export function bindChangeNavigationButtonsOnComplete(model: Model): () => void {
  const replaceNextWithComplete = readChangeNavigationButtonsOnComplete(
    model.getPropertyValue(CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY),
  );

  if (!replaceNextWithComplete) {
    model.canBeCompleted = () => undefined;
  }

  return () => {
    model.canBeCompleted = Model.prototype.canBeCompleted;
  };
}

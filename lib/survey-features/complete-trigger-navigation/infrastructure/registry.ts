import { Serializer } from "survey-core";
import {
  CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_DISPLAY_NAME,
  CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
  CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_VISIBLE_INDEX,
} from "../constants";

function hasProperty(): boolean {
  return Boolean(
    Serializer.findProperty(
      "survey",
      CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    ),
  );
}

export function registerCompleteTriggerNavigationProperty(): void {
  if (hasProperty()) {
    return;
  }

  Serializer.addProperty("survey", {
    name: CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    type: "boolean",
    default: true,
    displayName: CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_DISPLAY_NAME,
    category: "navigation",
    visibleIndex: CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_VISIBLE_INDEX,
  });
}

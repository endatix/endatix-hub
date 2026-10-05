import { Serializer } from "survey-core";
import {
  EDX_CHANGE_NAVIGATION_ON_COMPLETE_DISPLAY_NAME,
  EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
  EDX_CHANGE_NAVIGATION_ON_COMPLETE_VISIBLE_INDEX,
} from "../constants";

function findProperty() {
  return Serializer.findProperty(
    "survey",
    EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
  );
}

/**
 * Registers the survey JSON property, hidden. Idempotent.
 *
 * Registered but not shown: the property has to exist on every surface or
 * `Model.toJSON()` strips a stored `false` (see the extension module), while
 * the checkbox must not appear until the behavior is actually installed.
 * `revealCompleteTriggerNavigationProperty` is what shows it, from the
 * extension's `onInit`, which only runs when extensions are enabled.
 *
 * `category` must be the literal `"navigation"`. Built-in navigation
 * properties have an empty Serializer category; their tab comes from
 * SurveyQuestionEditorDefinition. Copying that empty category lands this
 * property on the others tab.
 *
 * Designer help text is registered from creator bindings, on creator ready.
 * This function stays free of survey-creator-core so a public form load does
 * not initialize Creator locale strings.
 */
export function registerCompleteTriggerNavigationProperty(): void {
  if (findProperty()) {
    return;
  }

  Serializer.addProperty("survey", {
    name: EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    type: "boolean",
    default: true,
    displayName: EDX_CHANGE_NAVIGATION_ON_COMPLETE_DISPLAY_NAME,
    category: "navigation",
    visibleIndex: EDX_CHANGE_NAVIGATION_ON_COMPLETE_VISIBLE_INDEX,
    visible: false,
  });
}

/**
 * Shows the checkbox on the Navigation tab. Called from the extension's
 * `onInit`, so an author only sees the control on a Hub where the behavior
 * runs. Serialization does not depend on this.
 */
export function revealCompleteTriggerNavigationProperty(): void {
  const property = findProperty();
  if (property) {
    property.visible = true;
  }
}

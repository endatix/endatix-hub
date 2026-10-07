import { Serializer } from "survey-core";
import { getLocaleStrings, SurveyLogic } from "survey-creator-core";

/**
 * A custom SurveyJS trigger as Survey Creator shows it. The Serializer class
 * must already be registered (see survey-core trigger.ts); this adds only the
 * Creator UI.
 */
export interface CreatorLogicTrigger {
  /** JSON `triggers[].type`, e.g. `screenout`. */
  type: string;
  /** Serializer class name, e.g. `screenouttrigger`. */
  className: string;
  /** Property grid trigger choice and Logic tab action name. */
  label: string;
  /** Logic tab action description. */
  description: string;
  /** Logic tab summary text, e.g. "respondent is screened out". */
  actionText: string;
}

/**
 * Adds a trigger to the Logic tab and labels it, in the shape Creator uses for
 * its own `trigger_complete`. Idempotent.
 *
 * Creator reads all of this on demand: `SurveyLogic.types` when the Logic tab
 * activates, `triggers.<class>` and `ed.lg.trigger_<type>*` through
 * editorLocalization, which falls back to the `en` strings object. Calling it
 * after `new SurveyCreator` is fine; `creator.updateLocalizedStrings()`
 * rebuilds anything already rendered.
 */
export function registerCreatorLogicTrigger(
  trigger: CreatorLogicTrigger,
): void {
  addLogicTriggerType(trigger);
  labelLogicTrigger(trigger);
}

type LogicType = {
  name: string;
  baseClass?: string;
  incorrectClasses?: string[];
};

function addLogicTriggerType(trigger: CreatorLogicTrigger): void {
  const logicName = `trigger_${trigger.type}`;
  const types = SurveyLogic.types as LogicType[];
  excludeFromParentLogicType(types, trigger.className);
  if (types.some((type) => type.name === logicName)) {
    return;
  }

  types.push({
    name: logicName,
    baseClass: trigger.className,
    propertyName: "expression",
    isUniqueItem: true,
    isInvisible: true,
  } as LogicType);
}

/**
 * Creator matches Logic types by class hierarchy, so a subclass of
 * `completetrigger` would also show as "Complete survey", and removing that
 * action deletes the trigger. `incorrectClasses` is how Creator opts a parent
 * type out (`LogicItemEditor.hasNeededTypes`).
 */
function excludeFromParentLogicType(
  types: LogicType[],
  className: string,
): void {
  const parentClass = Serializer.findClass(className)?.parentName;
  const parentType = types.find((type) => type.baseClass === parentClass);
  if (!parentClass || !parentType) {
    return;
  }

  const incorrectClasses = parentType.incorrectClasses ?? [];
  if (!incorrectClasses.includes(className)) {
    parentType.incorrectClasses = [...incorrectClasses, className];
  }
}

function labelLogicTrigger(trigger: CreatorLogicTrigger): void {
  const logicName = `trigger_${trigger.type}`;
  const strings = getLocaleStrings("en");
  strings.triggers[trigger.className] = trigger.label;
  strings.ed.lg[`${logicName}Name`] = trigger.label;
  strings.ed.lg[`${logicName}Description`] = trigger.description;
  strings.ed.lg[`${logicName}Text`] = trigger.actionText;
}

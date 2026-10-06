/** JSON `triggers[].type`. SurveyJS appends `trigger` when it loads the class. */
export const SCREEN_OUT_TRIGGER_TYPE = "screenout";

/** `getType()` and the Serializer class name. */
export const SCREEN_OUT_TRIGGER_CLASS = "screenouttrigger";

/** Public save field. Not a SurveyJS type. */
export const SCREEN_OUT_OUTCOME = "screen_out";

export function isScreenOutTrigger(
  trigger: { getType?: () => string } | undefined,
): boolean {
  return trigger?.getType?.() === SCREEN_OUT_TRIGGER_CLASS;
}

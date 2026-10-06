export const SCREEN_OUT_TRIGGER_TYPE = "screenout";
export const SCREEN_OUT_OUTCOME = "screen_out";

export function isScreenOutTrigger(
  trigger: { getType?: () => string } | undefined,
): boolean {
  return trigger?.getType?.() === SCREEN_OUT_TRIGGER_TYPE;
}

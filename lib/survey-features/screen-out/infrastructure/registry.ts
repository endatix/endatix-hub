import { Serializer, SurveyTriggerComplete } from "survey-core";
import { SCREEN_OUT_TRIGGER_TYPE } from "../constants";

class ScreenOutTrigger extends SurveyTriggerComplete {
  public getType(): string {
    return SCREEN_OUT_TRIGGER_TYPE;
  }
}

let registered = false;

/** Register before form JSON loads so an unknown trigger type is not dropped. */
export function registerScreenOutTrigger(): void {
  if (registered) {
    return;
  }
  registered = true;
  Serializer.addClass(
    SCREEN_OUT_TRIGGER_TYPE,
    [],
    () => new ScreenOutTrigger(),
    "completetrigger",
  );
}

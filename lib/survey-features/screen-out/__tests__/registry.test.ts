import { describe, expect, it } from "vitest";
import { editorLocalization, getLocaleStrings } from "survey-creator-core";
import { isScreenOutTrigger, SCREEN_OUT_TRIGGER_CLASS } from "../constants";
import { registerScreenOutLogicAction } from "../infrastructure/creator-bindings";
import { registerScreenOutTrigger } from "../infrastructure/registry";
import { Serializer } from "survey-core";

describe("screen-out trigger", () => {
  it("is the screenout type", () => {
    expect(
      isScreenOutTrigger({ getType: () => SCREEN_OUT_TRIGGER_CLASS }),
    ).toBe(true);
    expect(isScreenOutTrigger({ getType: () => "completetrigger" })).toBe(
      false,
    );
    expect(isScreenOutTrigger(undefined)).toBe(false);
  });

  it("registers before form JSON is loaded", () => {
    registerScreenOutTrigger();
    expect(Serializer.findClass(SCREEN_OUT_TRIGGER_CLASS)).toBeDefined();
  });

  it("labels the trigger Screen out", () => {
    registerScreenOutLogicAction();
    const strings = getLocaleStrings("en");

    expect(strings.triggers[SCREEN_OUT_TRIGGER_CLASS]).toBe("Screen out");
    expect(strings.ed.lg.trigger_screenoutName).toBe("Screen out");
    expect(editorLocalization.getTriggerName(SCREEN_OUT_TRIGGER_CLASS)).toBe(
      "Screen out",
    );
  });
});

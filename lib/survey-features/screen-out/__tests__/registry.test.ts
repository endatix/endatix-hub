import { describe, expect, it } from "vitest";
import { isScreenOutTrigger, SCREEN_OUT_TRIGGER_TYPE } from "../constants";
import { registerScreenOutTrigger } from "../infrastructure/registry";
import { Serializer } from "survey-core";

describe("screen-out trigger", () => {
  it("is the screenout type", () => {
    expect(
      isScreenOutTrigger({ getType: () => SCREEN_OUT_TRIGGER_TYPE }),
    ).toBe(true);
    expect(isScreenOutTrigger({ getType: () => "completetrigger" })).toBe(
      false,
    );
    expect(isScreenOutTrigger(undefined)).toBe(false);
  });

  it("registers before form JSON is loaded", () => {
    registerScreenOutTrigger();
    expect(Serializer.findClass(SCREEN_OUT_TRIGGER_TYPE)).toBeDefined();
  });
});

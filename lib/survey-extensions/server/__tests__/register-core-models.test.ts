import { Serializer } from "survey-core";
import { describe, expect, it } from "vitest";
import { registerCoreSurveyModels } from "../register-core-models";

describe("registerCoreSurveyModels", () => {
  it("registers the custom pieces a saved form may hold, without the browser", () => {
    registerCoreSurveyModels();
    registerCoreSurveyModels();

    for (const type of [
      "screenouttrigger",
      "audiorecorder",
      "dragcategorize",
    ]) {
      expect(Serializer.findClass(type)?.name).toBe(type);
    }
  });
});

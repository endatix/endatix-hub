import { Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";

const EXPECTED_PROP_NAMES = [
  "loopSource",
  "choicePattern",
  "randomizeLoop",
  "maxLoopCount",
  "priorityItems",
  "exitLoopCondition",
  "exitAllLoopsCondition",
  "exitMeta",
] as const;

describe("registerQuestionLoopsGlobals", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  describe("Serializer properties for paneldynamic", () => {
    it("registers all expected questionLoops properties on paneldynamic", () => {
      for (const name of EXPECTED_PROP_NAMES) {
        const property = Serializer.findProperty("paneldynamic", name);
        expect(property, `property ${name}`).toBeDefined();
        expect(property?.name).toBe(name);
      }
    });

    it("registers loopSource with type multiplevalues", () => {
      const property = Serializer.findProperty("paneldynamic", "loopSource");
      expect(property?.type).toBe("multiplevalues");
      expect(property?.displayName).toBe("Select source question(s)");
    });

    it("registers choicePattern with type dropdown", () => {
      const property = Serializer.findProperty("paneldynamic", "choicePattern");
      expect(property?.type).toBe("dropdown");
      expect(property?.displayName).toBe("Loop over");
    });

    it("registers randomizeLoop as boolean", () => {
      const property = Serializer.findProperty("paneldynamic", "randomizeLoop");
      expect(property?.type).toBe("boolean");
      expect(property?.displayName).toBe("Randomize items");
    });

    it("registers maxLoopCount as number", () => {
      const property = Serializer.findProperty("paneldynamic", "maxLoopCount");
      expect(property?.type).toBe("number");
      expect(property?.displayName).toBe("Maximum number of loops");
    });

    it("registers priorityItems with dependsOn loopSource", () => {
      const property = Serializer.findProperty("paneldynamic", "priorityItems");
      expect(property?.type).toBe("multiplevalues");
      expect(property?.dependsOn).toEqual(["loopSource"]);
    });
  });
});

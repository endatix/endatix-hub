import {
  Helpers,
  ItemValue,
  QuestionSelectBase,
  Serializer,
} from "survey-core";

interface IHasGroup {
  group: string;
}

/**
 * `randomizeArray` is private on `QuestionSelectBase`, so it is not on the
 * public typings. It is a plain prototype method at runtime, which is what the
 * design-mode override below replaces.
 */
type ChoiceRandomizer = (array: ItemValue[]) => ItemValue[];
const selectBasePrototype = QuestionSelectBase.prototype as unknown as {
  randomizeArray?: ChoiceRandomizer;
};

const originalRandomizeArray = Helpers.randomizeArray;
const originalQuestionRandomizeArray = selectBasePrototype.randomizeArray;
let isInitialized = false;

function isRandomChoiceOrder(obj: ItemValue): boolean {
  return (
    obj?.locOwner instanceof QuestionSelectBase &&
    obj.locOwner.choicesOrder === "random"
  );
}

/**
 * SurveyJS 3 already registers `itemvalue.randomize` as hidden detail metadata.
 * A second `addProperties` is ignored (`fillAllProperties` keeps the first),
 * which is why the Choices table never showed the checkbox. Configure the
 * built-in property, and only register one if a later survey-core drops it.
 */
function configureChoiceRandomizationProperties(): void {
  const randomizeProperty = Serializer.findProperty("itemvalue", "randomize");
  if (randomizeProperty) {
    randomizeProperty.visible = true;
    randomizeProperty.locationInTable = "column";
    randomizeProperty.visibleIf = isRandomChoiceOrder;
  } else {
    Serializer.addProperty("itemvalue", {
      name: "randomize:boolean",
      default: true,
      visible: true,
      locationInTable: "column",
      visibleIf: isRandomChoiceOrder,
    });
  }
}

/**
 * `"column"` is SurveyJS 3's list-column placement. The previous `"table"`
 * value is not a show mode: `get showMode()` returns `""` for anything else,
 * and that empty string skips the filter, which is why the Group column
 * appeared anyway.
 */
function addGroupColumn(): void {
  if (Serializer.findProperty("itemvalue", "group")) {
    return;
  }

  Serializer.addProperty("itemvalue", {
    name: "group",
    locationInTable: "column",
    dependsOn: ["randomize"],
    visibleIf: isRandomChoiceOrder,
  });
}

/**
 * `seed` must be forwarded: survey-core derives a stable per-question seed from
 * `survey.randomSeed`, which keeps the shuffle identical every time
 * `visibleChoices` is recalculated. Dropping it makes survey-core fall back to
 * `Date.now()`, so questions whose choices are rebuilt on each value change
 * (carry forward, data lists) get reshuffled on every interaction.
 */
function installGroupedRandomizeArray(): void {
  Helpers.randomizeArray = function <T>(array: T[], seed?: number): T[] {
    if (!array || array.length === 0) {
      return array;
    }

    const hasItemsWithGroups = array.some((item) => hasGroup(item));

    if (!hasItemsWithGroups) {
      return originalRandomizeArray.call(this, array, seed) as T[];
    }

    return groupRandomize(array, seed);
  };
}

/**
 * Skip randomization whenever the survey is in design mode, so the Designer
 * shows the authored order everywhere and randomization stays a preview /
 * runtime concern.
 */
function installDesignModeRandomizeSkip(): void {
  if (typeof originalQuestionRandomizeArray !== "function") {
    return;
  }

  selectBasePrototype.randomizeArray = function (
    this: QuestionSelectBase,
    array: ItemValue[],
  ): ItemValue[] {
    if (this.isDesignMode) {
      return array;
    }

    return originalQuestionRandomizeArray.call(this, array);
  };
}

function addRandomizeGroupFeature() {
  if (isInitialized) {
    return;
  }

  installGroupedRandomizeArray();
  installDesignModeRandomizeSkip();
  configureChoiceRandomizationProperties();
  addGroupColumn();
  isInitialized = true;
}

function groupRandomize<T>(array: T[], seed?: number): T[] {
  const groups = new Map<string, T[]>();
  array.forEach((item) => {
    const key = hasGroup(item) ? item.group : "__default__";
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  });

  return [...groups.values()].flatMap((items) =>
    originalRandomizeArray([...items], seed),
  );
}

function hasGroup(obj: unknown): obj is IHasGroup {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "group" in obj &&
    typeof (obj as Record<string, unknown>).group === "string"
  );
}
export default addRandomizeGroupFeature;

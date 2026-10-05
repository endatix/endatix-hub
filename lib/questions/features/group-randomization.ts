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

/**
 * Manual Entry is a positional format, so a new column changes the meaning of
 * every field after it. Group already shipped as the third field; keeping
 * Randomize behind it leaves `value|text|group` lines working as before.
 * Any index above the serializer default of -1 sorts the column last.
 */
const RANDOMIZE_COLUMN_INDEX = 20;

/** Buckets ungrouped items without colliding with an author's group name. */
const UNGROUPED = Symbol("ungrouped");

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
 * Survey Creator builds the Manual Entry field list from `question.columns`,
 * which carries every visible column whether or not its `visibleIf` passes, and
 * it assigns each field as the raw typed string. A visible boolean column there
 * would write `"true"` / `"false"` into every choice, and survey-core pins an
 * item on `randomize === false`, so a string would silently unpin it.
 * `onSettingValue` keeps the stored value a boolean whatever writes it.
 */
function coerceToPinnedBoolean(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase() === "false" ? false : true;
}

/**
 * SurveyJS 3 already registers `itemvalue.randomize` as hidden detail metadata.
 * A second `addProperties` is ignored (`fillAllProperties` keeps the first),
 * which is why the Choices table never showed the checkbox. Configure the
 * built-in property instead. There is no fallback: `findProperty` is typed as
 * always returning one, and a survey-core that drops it should fail loudly at
 * startup rather than ship a checkbox that saves a value nothing reads.
 */
function configureChoiceRandomizationProperties(): void {
  const randomizeProperty = Serializer.findProperty("itemvalue", "randomize");
  randomizeProperty.visible = true;
  randomizeProperty.locationInTable = "column";
  randomizeProperty.visibleIndex = RANDOMIZE_COLUMN_INDEX;
  randomizeProperty.visibleIf = isRandomChoiceOrder;
  randomizeProperty.onSettingValue = (_obj, value) =>
    coerceToPinnedBoolean(value);
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

/**
 * survey-core seeds a fresh `mulberry32` on every call, so handing one seed to
 * every bucket gives two groups of the same size the same permutation. Mixing
 * the group name into the seed keeps each bucket independent and still
 * reproducible for a given survey seed. Zero is avoided because survey-core
 * reads a falsy seed as "use `Date.now()`".
 */
function deriveBucketSeed(seed: number | undefined, key: string): number | undefined {
  if (seed === undefined) {
    return undefined;
  }

  let derived = seed;
  for (let i = 0; i < key.length; i++) {
    derived = Math.imul(derived ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }

  return derived === 0 ? 1 : derived;
}

function groupRandomize<T>(array: T[], seed?: number): T[] {
  const buckets = new Map<string | symbol, T[]>();
  array.forEach((item) => {
    const key = hasGroup(item) ? item.group : UNGROUPED;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  });

  return [...buckets.entries()].flatMap(([key, items]) =>
    originalRandomizeArray(
      items,
      deriveBucketSeed(seed, typeof key === "string" ? key : ""),
    ),
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

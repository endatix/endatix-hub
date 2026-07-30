import {
  Serializer,
  Helpers,
  ItemValue,
  QuestionSelectBase,
} from "survey-core";

interface IHasGroup {
  group: string;
  randomize: boolean;
}

const originalRandomizeArray = Helpers.randomizeArray;
let isInitialized = false;

function addRandomizeGroupFeature() {
  if (isInitialized) {
    return;
  }

  /**
   * `seed` must be forwarded: survey-core derives a stable per-question seed from
   * `survey.randomSeed`, which keeps the shuffle identical every time
   * `visibleChoices` is recalculated. Dropping it makes survey-core fall back to
   * `Date.now()`, so questions whose choices are rebuilt on each value change
   * (carry forward, data lists) get reshuffled on every interaction.
   */
  Helpers.randomizeArray = function <T>(array: T[], seed?: number): T[] {
    if (!array || array.length === 0) {
      return array;
    }

    const hasItemsWithGroups = array.some((c) => hasGroup(c));

    if (!hasItemsWithGroups) {
      return originalRandomizeArray.call(this, array, seed) as T[];
    }

    return groupRandomize(array, seed);
  };

  Serializer.addProperties("itemvalue", [
    {
      name: "randomize:boolean",
      locationInTable: "table",
      default: true,
      visibleIf: (obj: ItemValue) => {
        return (
          obj?.locOwner instanceof QuestionSelectBase &&
          obj.locOwner.choicesOrder === "random"
        );
      },
    },
    {
      name: "group",
      locationInTable: "table",
      dependsOn: ["randomize"],
      visibleIf: (obj) => {
        return (
          obj?.locOwner instanceof QuestionSelectBase &&
          obj.locOwner.choicesOrder === "random"
        );
      },
    },
  ]);

  isInitialized = true;
}

function groupRandomize<T>(array: T[], seed?: number): T[] {
  const groups = new Map<string, T[]>();
  array.forEach((c) => {
    const g = hasGroup(c) ? c.group : "__default__";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(c);
  });

  const orderedGroups: string[] = [];
  array.forEach((c) => {
    const g = hasGroup(c) ? c.group : "__default__";
    if (!orderedGroups.includes(g)) orderedGroups.push(g);
  });

  const result: T[] = [];
  orderedGroups.forEach((g) => {
    let items = groups.get(g)!;
    const randomize = hasGroup(items[0]) ? items[0].randomize !== false : true;
    if (randomize) {
      items = originalRandomizeArray([...items], seed);
    }
    result.push(...items);
  });

  return result;
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

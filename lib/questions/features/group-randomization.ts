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

  Helpers.randomizeArray = function <T>(array: T[]): T[] {
    if (!array || array.length === 0) {
      return array;
    }

    const hasItemsWithGroups = array.some((c) => hasGroup(c));

    if (!hasItemsWithGroups) {
      return originalRandomizeArray.call(this, array) as T[];
    }

    return groupRandomize(array);
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

function groupRandomize<T>(array: T[]): T[] {
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
      items = originalRandomizeArray([...items]);
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

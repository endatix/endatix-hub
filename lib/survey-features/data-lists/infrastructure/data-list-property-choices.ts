import { DataList } from "@/lib/endatix-api/data-lists/types";
import { Serializer } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import { DATA_LIST_QUESTION_TYPES } from "./data-list-survey-integration";
import { registerDataListGlobals } from "./registry";

export function setDataListPropertyChoices(dataLists: DataList[]): void {
  registerDataListGlobals();
  const choices = dataLists.map((item) => ({
    value: String(item.id),
    text: item.name,
  }));

  for (const questionType of DATA_LIST_QUESTION_TYPES) {
    Serializer.findProperty(questionType, DATA_LIST_PROPERTY_NAME)?.setChoices(
      choices,
    );
  }
}

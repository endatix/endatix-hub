import { findConvertibleChoiceQuestions } from "../data-lists/conversion/inline-choice-conversion";
import { applyDataListBindingToQuestionJson } from "../data-lists/utils/question-binding";
import { definitionBytes } from "./definition-size";

const binding = { choices: [] };
applyDataListBindingToQuestionJson(binding, "1000000000000000000");
const replacementBytes = definitionBytes(binding) - definitionBytes({ choices: [] }) + definitionBytes([]);

export function choiceListCheck(source: object, isForm: boolean) {
  const lists = isForm ? findConvertibleChoiceQuestions(source) : [];
  const bytes = lists.reduce((total, list) => total + list.choiceBytes, 0);
  const eligible = lists.filter(list => list.choiceCount >= 10);
  const eligibleBytes = eligible.reduce((total,list) => total + list.choiceBytes, 0);
  const recommended = eligibleBytes > 100 * 1024 || eligible.some(list => list.choiceCount > 200 || list.choiceBytes > 50 * 1024);
  return { count: lists.length, bytes, recommended, impact: eligibleBytes - eligible.length * replacementBytes };
}

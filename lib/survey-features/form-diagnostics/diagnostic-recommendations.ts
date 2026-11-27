import { findConvertibleChoiceQuestions } from "../data-lists/conversion/inline-choice-conversion";

export function choiceListCheck(source: object, isForm: boolean, threshold = 10) {
  const lists = isForm ? findConvertibleChoiceQuestions(source) : [];
  const bytes = lists.reduce((total, list) => total + list.choiceBytes, 0);
  const eligible = lists.filter(list => list.choiceCount >= threshold && list.projectedSavings !== null);
  const eligibleBytes = eligible.reduce((total,list) => total + list.choiceBytes, 0);
  const recommended = eligibleBytes > 100 * 1024 || eligible.some(list => list.choiceCount > 200 || list.choiceBytes > 50 * 1024);
  const impact = eligible.reduce((total,list) => total + (list.projectedSavings ?? 0), 0);
  return { count: lists.length, bytes, eligible:eligible.length, eligibleBytes, recommended, impact };
}

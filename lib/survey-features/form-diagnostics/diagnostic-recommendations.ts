import { findConvertibleChoiceQuestions } from "../data-lists/conversion/inline-choice-conversion";
import type { FormDiagnosticsStats } from "./form-diagnostics-logic";

export function choiceListCheck(source: object, isForm: boolean) {
  const lists = isForm ? findConvertibleChoiceQuestions(source) : [];
  const bytes = lists.reduce((total, list) => total + list.choiceBytes, 0);
  const recommended = bytes > 100 * 1024 || lists.some(list => list.choiceCount > 200 || list.choiceBytes > 50 * 1024);
  return { count: lists.length, bytes, recommended };
}

export function structureNotes(stats: FormDiagnosticsStats, remainingBytes: number) {
  const notes: string[] = [];
  if (remainingBytes > 1024 * 1024) notes.push("The definition exceeds 1 MB. Review large content in the JSON editor.");
  if (stats.totalQuestions > 100) notes.push(`${stats.totalQuestions} questions. Consider splitting the form into shorter sections.`);
  if (stats.logicConditionsCount > 50) notes.push(`${stats.logicConditionsCount} logic conditions. Review complex or redundant conditions.`);
  return notes;
}

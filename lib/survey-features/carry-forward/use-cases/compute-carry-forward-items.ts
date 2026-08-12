import type { Question, ItemValue } from "survey-core";
import { extractUniqueChoicesBy, getChoicesFromSourceQuestion } from "@/lib/utils/survey";
import { limitCarryForwardChoices, parseCarryForwardMaxChoices } from "../utils/limit-carry-forward-choices";
import { resolveCarryForwardSelectionMode } from "../utils/map-carry-forward-mode";
import { resolveEffectiveCarryForwardModeForSource } from "../utils/resolve-effective-carry-forward-mode";
import { splitByPriority } from "../utils/split-by-priority";
import { getCarryForwardSourceQuestions } from "../utils/carry-forward-target-query";
import type { AdvancedCarryForwardModeInput } from "../carry-forward-mode-values";

/**
 * The subset of carry-forward's config properties the aggregation pipeline
 * actually reads — deliberately not `AdvancedCarryForwardQuestion` (which
 * requires `QuestionSelectBase`), so this also accepts non-select-base
 * targets like matrix-carousel's rows (see sync-rows-from-source.ts).
 */
export interface CarryForwardSourceConfig {
  name?: string;
  edxCarryForwardSources?: string[];
  edxCarryForwardMode?: AdvancedCarryForwardModeInput;
  edxCarryForwardPriorityItems?: string[];
  edxCarryForwardMaxChoices?: number | string;
}

/**
 * Resolves a target's configured sources into a priority/rest split of
 * aggregated, deduplicated, max-choices-limited items — the shared middle of
 * carry-forward's sync pipeline, extracted so both the original choices-based
 * sync (sync-carry-forward-target.ts) and matrix-carousel's rows-based sync
 * (sync-rows-from-source.ts) compute identically from the same settings,
 * rather than two independent reimplementations drifting apart. Deliberately
 * stops short of writing anywhere or copying items onto a target — item
 * construction differs by target shape (QuestionSelectBase.createItemValue
 * vs. a plain ItemValue for a matrix row), so that stays with each caller.
 */
export function computeCarryForwardAggregatedItems(
  survey: { getQuestionByName: (name: string) => Question | null },
  target: CarryForwardSourceConfig,
): { priority: ItemValue[]; rest: ItemValue[] } {
  const sourceQuestions = getCarryForwardSourceQuestions(survey, target);
  const selectionMode = resolveCarryForwardSelectionMode(target.edxCarryForwardMode);
  const aggregatedChoices = extractUniqueChoicesBy(sourceQuestions, (source) =>
    getChoicesFromSourceQuestion(
      source,
      resolveEffectiveCarryForwardModeForSource(source, selectionMode),
    ),
  );
  const { priority, rest } = splitByPriority(
    aggregatedChoices,
    target.edxCarryForwardPriorityItems,
  );
  const maxChoiceLimit = parseCarryForwardMaxChoices(target.edxCarryForwardMaxChoices);

  return limitCarryForwardChoices(priority, rest, maxChoiceLimit);
}

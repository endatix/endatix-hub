import { Helpers, ItemValue } from "survey-core";
import type { Model, QuestionMatrixModel } from "survey-core";
import { findImageProperty, readItemImage } from "@/lib/utils/survey";
import { computeCarryForwardAggregatedItems } from "@/lib/survey-features/carry-forward/use-cases/compute-carry-forward-items";
import { IMAGE_URL_PROPERTY } from "../constants";
import type { MatrixCarouselQuestion, MatrixRowItemValue } from "../types";
import { isMatrixCarouselRowSourceEnabled } from "./matrix-carousel-state";

/**
 * Builds a matrix row from a sourced choice item — the rows equivalent of
 * copyChoiceItemWithMedia, adapted for a target that has no
 * QuestionSelectBase.createItemValue() to delegate to (a matrix row is a
 * plain ItemValue via the matrixrowitem class, not a question's own choice).
 *
 * Deliberately does not mark priority items with .group/.randomize the way
 * markPriorityChoices does for carry-forward's choices: verified against
 * survey.core.js that QuestionMatrixModel.sortVisibleRows() randomizes the
 * whole rows array unconditionally (`Helpers.randomizeArray(array,
 * this.randomSeed)`, no group-aware exception the way choice randomization
 * respects .group/.randomize) — so that marking would be dead weight for
 * rows. Priority still controls initial row order; it just doesn't stay
 * pinned to the front if rowOrder is later set to Random, unlike Choices
 * order — a real, current platform gap, not an oversight here.
 */
function buildRowFromChoice(choice: ItemValue): MatrixRowItemValue {
  const row = new ItemValue(choice.value, choice.text) as MatrixRowItemValue;
  const image = readItemImage(choice);
  // setPropertyValue, not a raw `row.imageUrl = image` assignment — a plain
  // property write on a manually-constructed ItemValue doesn't route through
  // the same internal storage getPropertyValue()/serialization reads from
  // (JSON-parsed rows work because SurveyJS's own deserializer uses
  // setPropertyValue internally too).
  if (image && findImageProperty(row)) {
    row.setPropertyValue(IMAGE_URL_PROPERTY, image);
  }

  return row;
}

/**
 * Rebuilds `target.rows` from carry-forward's configured source(s) when row-
 * sourcing is enabled. Reuses the exact same aggregation pipeline carry-
 * forward's own choices-based sync uses — multi-source aggregation, mode
 * filtering (all/selected/unselected), priority ordering, max-count limiting
 * — via computeCarryForwardAggregatedItems, so matrix rows and question
 * choices are sourced with identical settings/behavior, just written to a
 * different target property. Mirrors sync-carry-forward-target.ts's own
 * write pattern (target.choices = newChoices; target.clearIncorrectValues())
 * — assigning `rows` here also fires the onPropertyChanged("rows") handler
 * already bound in survey-bindings.ts, which resets the decomposed-question
 * cache and reclamps currentRowIndex, so that doesn't need duplicating.
 */
export function syncMatrixCarouselRowsFromSource(
  survey: Pick<Model, "getQuestionByName">,
  target: QuestionMatrixModel,
): void {
  const carouselTarget = target as MatrixCarouselQuestion;
  if (!isMatrixCarouselRowSourceEnabled(carouselTarget)) {
    return;
  }

  const { priority, rest } = computeCarryForwardAggregatedItems(survey, carouselTarget);
  const newRows = [...priority, ...rest].map(buildRowFromChoice);

  const rowsChanged = !Helpers.isArraysEqual(target.rows, newRows, false);
  if (rowsChanged) {
    target.rows = newRows;
    target.clearIncorrectValues();
  }
}

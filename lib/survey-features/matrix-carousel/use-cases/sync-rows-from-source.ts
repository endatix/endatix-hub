import { Helpers, ItemValue } from "survey-core";
import type { Model, QuestionMatrixModel, QuestionSelectBase } from "survey-core";
import { getChoicesFromSourceQuestion, isSelectBaseQuestion } from "@/lib/utils/survey";
import { findImageProperty, readItemImage } from "@/lib/utils/survey";
import { IMAGE_URL_PROPERTY } from "../constants";
import type { MatrixCarouselQuestion, MatrixRowItemValue } from "../types";
import { isMatrixCarouselRowSourceEnabled } from "./matrix-carousel-state";
import { resolveRowsSourceSelectionMode } from "../utils/resolve-rows-source-selection-mode";

/**
 * Resolves edxRowsSourceQuestion to an actual select-base question in the
 * survey. Not a full carry-forward target lookup — single source only, per
 * the plan's explicit "simpler than full carry-forward" scope.
 */
export function getRowSourceQuestion(
  survey: Pick<Model, "getQuestionByName">,
  target: MatrixCarouselQuestion,
): QuestionSelectBase | undefined {
  const name = target.edxRowsSourceQuestion;
  if (!name) {
    return undefined;
  }

  const source = survey.getQuestionByName(name);
  if (!source || !isSelectBaseQuestion(source)) {
    return undefined;
  }

  return source;
}

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
 * Rebuilds `target.rows` from a source question's choices when row-sourcing
 * is enabled. Mirrors sync-carry-forward-target.ts's own pattern
 * (target.choices = newChoices; target.clearIncorrectValues()) — assigning
 * `rows` here also fires the onPropertyChanged("rows") handler already bound
 * in survey-bindings.ts, which resets the decomposed-question cache and
 * reclamps currentRowIndex, so that doesn't need duplicating.
 */
export function syncMatrixCarouselRowsFromSource(
  survey: Pick<Model, "getQuestionByName">,
  target: QuestionMatrixModel,
): void {
  const carouselTarget = target as MatrixCarouselQuestion;
  if (!isMatrixCarouselRowSourceEnabled(carouselTarget)) {
    return;
  }

  const source = getRowSourceQuestion(survey, carouselTarget);
  if (!source) {
    return;
  }

  const selectionMode = resolveRowsSourceSelectionMode(
    carouselTarget.edxRowsSourceSelectionMode,
  );
  const choices = getChoicesFromSourceQuestion(source, selectionMode);
  const newRows = choices.map(buildRowFromChoice);

  const rowsChanged = !Helpers.isArraysEqual(target.rows, newRows, false);
  if (rowsChanged) {
    target.rows = newRows;
    target.clearIncorrectValues();
  }
}

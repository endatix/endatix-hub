import { DATA_LIST_PROPERTY_NAME } from "../constants";
import type { Question } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";

type CreatorWithPropertyGrid = SurveyCreatorModel & {
  designerPropertyGrid?: { refresh(): void };
};

/**
 * Rebuilds the property grid for the selected question so dropdown editors
 * reflect Serializer choice updates and the current `edxDataListId` value.
 */
export function syncDataListPropertyGridAfterBinding(
  creator: SurveyCreatorModel | null | undefined,
  question: Question,
): void {
  if (!creator || creator.selectedElement !== question) {
    return;
  }

  const creatorWithGrid = creator as CreatorWithPropertyGrid;

  if (creatorWithGrid?.designerPropertyGrid) {
    creatorWithGrid.designerPropertyGrid.refresh();
  }
  creator.selectElement(question, DATA_LIST_PROPERTY_NAME, false);
}

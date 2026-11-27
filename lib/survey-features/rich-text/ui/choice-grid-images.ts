import { ItemValue, type GetMatrixRowActionsEvent, type SurveyModel } from "survey-core";
import type { SurveyCreatorModel, SurveyInstanceCreatedEvent } from "survey-creator-core";
import type { ImageTarget } from "./image-settings-target";

type Open = (target: ImageTarget) => void;

function rowTarget({ question, row }: GetMatrixRowActionsEvent, creator: SurveyCreatorModel) {
  const item = row.editingObj;
  const cell = row.getQuestionByColumnName("text");
  if (question.name !== "choices" || !(item instanceof ItemValue) || !cell) return;
  const editable = () => !creator.readOnly && !cell.isDisposed && !question.isReadOnly && !cell.isReadOnly;
  if (!editable()) return;
  const locale = item.getLocale();
  const value = item.text;
  const template = document.createElement("template");
  template.innerHTML = value;
  const images = Array.from(template.content.querySelectorAll("img"));
  const commit = (index: number, image: HTMLImageElement) => {
    if (!editable() || row.editingObj !== item || item.getLocale() !== locale || item.text !== value) return false;
    if (images[index]) images[index].replaceWith(image);
    else template.content.prepend(image);
    cell.value = template.innerHTML;
    return true;
  };
  return { images, selected: images.length ? 0 : -1, commit };
}

function rowAction(creator: SurveyCreatorModel, open: Open) {
  return (_: SurveyModel, event: GetMatrixRowActionsEvent) => {
    if (event.question.name !== "choices" || creator.readOnly || event.question.isReadOnly ||
      event.row.getQuestionByColumnName("text")?.isReadOnly) return;
    event.actions.push({ id: "choice-image", title: "Choice image settings", iconName: "icon-image",
      location: "end", showTitle: false, action: () => {
        const target = rowTarget(event, creator);
        if (target) open(target);
      } });
  };
}

export function bindChoiceGridImages(creator: SurveyCreatorModel, open: Open) {
  let current: SurveyModel | undefined;
  const action = rowAction(creator, open);
  const bind = (survey: SurveyModel) => {
    current?.onGetMatrixRowActions.remove(action);
    current = survey;
    current?.onGetMatrixRowActions.add(action);
  };
  const created = (_: SurveyCreatorModel, event: SurveyInstanceCreatedEvent) => {
    if (event.area === "property-grid") bind(event.survey);
  };
  bind(creator.propertyGrid);
  creator.onSurveyInstanceCreated.add(created);
  return () => {
    creator.onSurveyInstanceCreated.remove(created);
    current?.onGetMatrixRowActions.remove(action);
  };
}

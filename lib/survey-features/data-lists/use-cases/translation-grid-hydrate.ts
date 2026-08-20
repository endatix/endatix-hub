import {
  ItemValue,
  LocalizableString,
  Serializer,
  type PanelModel,
  type QuestionMatrixDropdownModel,
  type SurveyModel,
} from "survey-core";
import { TranslationItem, type SurveyCreatorModel } from "survey-creator-core";
import {
  getDataListIdFromQuestion,
  isDataListQuestion,
} from "../infrastructure/data-list-survey-integration";
import {
  DATA_LIST_TRANSLATION_HELP,
  buildDataListDetailsPath,
  dataListLocaleStatus,
  formatDataListTranslationGroupTitle,
} from "./data-list-translation-group-header";
import type { DataListTranslationCatalog } from "./surveyjs-translation-csv";

const TRANSLATION_TAB_NAME = "translation";
export const DATA_LIST_HEADER_GROUP_PREFIX = "edxDataList_";
const HEADER_BINDINGS_KEY = "__endatixDataListHeaderBound";
const PLACEHOLDER_BINDINGS_KEY = "__endatixDataListPlaceholderBound";
const CHOICES_ROW_NAME = "choices";

/** Survey Creator translation-tab model surface used by data-list grid hydration. */
export type TranslationModelLike = {
  stringsSurvey?: SurveyModel;
  addLocale?: (locale: string) => void;
  onPropertyChanged?: {
    add: (
      handler: (
        sender: TranslationModelLike,
        options: { name: string },
      ) => void,
    ) => void;
  };
};

type TranslationTabPluginLike = {
  model?: TranslationModelLike;
};

type TranslationItemLike = {
  getPlaceholder?: (locale: string) => string;
};

type PanelCssClasses = {
  container?: string;
  title?: string;
  content?: string;
};

export function removeDataListTranslationSummaries(
  creator: SurveyCreatorModel,
): void {
  const stringsSurvey = getTranslationModel(creator)?.stringsSurvey;
  if (stringsSurvey) {
    removeExistingSummaryPanels(stringsSurvey);
  }
}

export function injectDataListTranslationSummaries(
  creator: SurveyCreatorModel,
  catalogs: ReadonlyMap<string, DataListTranslationCatalog>,
): void {
  const model = getTranslationModel(creator);
  const stringsSurvey = model?.stringsSurvey;
  if (!model || !stringsSurvey || !creator.survey) {
    return;
  }

  bindSummaryPanelChrome(stringsSurvey, catalogs);
  bindPlaceholderRefresh(stringsSurvey);
  removeExistingSummaryPanels(stringsSurvey);

  for (const question of creator.survey.getAllQuestions(false, true, true)) {
    if (
      typeof question.getType !== "function" ||
      !isDataListQuestion(question)
    ) {
      continue;
    }

    const dataListId = getDataListIdFromQuestion(question);
    const catalog = dataListId ? catalogs.get(dataListId) : undefined;
    const parent = stringsSurvey
      .getAllPanels()
      .find((panel) => panel.name === question.name) as PanelModel | undefined;
    if (!catalog || !parent) {
      continue;
    }

    attachSummaryPanel(parent, catalog, model);
  }

  applyDataListTranslationPlaceholders(stringsSurvey);
}

export function applyDataListTranslationPlaceholders(
  stringsSurvey: SurveyModel | undefined,
): void {
  if (!stringsSurvey) {
    return;
  }

  for (const panel of stringsSurvey.getAllPanels() as PanelModel[]) {
    if (!String(panel.name).startsWith(DATA_LIST_HEADER_GROUP_PREFIX)) {
      continue;
    }

    for (const question of panel.questions) {
      if (question.getType() !== "matrixdropdown") {
        continue;
      }

      applyMatrixPlaceholders(question as QuestionMatrixDropdownModel);
    }
  }
}

export function bindAddLocalePlaceholderRefresh(
  model: TranslationModelLike,
): void {
  const modelWithFlag = model as TranslationModelLike & Record<string, unknown>;
  if (!model.addLocale || modelWithFlag[PLACEHOLDER_BINDINGS_KEY]) {
    return;
  }

  modelWithFlag[PLACEHOLDER_BINDINGS_KEY] = true;

  const originalAddLocale = model.addLocale.bind(model);
  model.addLocale = (locale: string) => {
    originalAddLocale(locale);
    applyDataListTranslationPlaceholders(model.stringsSurvey);
  };

  model.onPropertyChanged?.add((_, options) => {
    if (options.name === "locales") {
      applyDataListTranslationPlaceholders(model.stringsSurvey);
    }
  });
}

function getTranslationModel(
  creator: SurveyCreatorModel,
): TranslationModelLike | undefined {
  const plugin = creator.getPlugin(TRANSLATION_TAB_NAME) as
    | TranslationTabPluginLike
    | undefined;
  return plugin?.model;
}

function attachSummaryPanel(
  parent: PanelModel,
  catalog: DataListTranslationCatalog,
  model: TranslationModelLike,
): void {
  const header = Serializer.createClass("panel") as PanelModel;
  header.name = `${DATA_LIST_HEADER_GROUP_PREFIX}${catalog.dataListId}`;
  header.title = formatDataListTranslationGroupTitle(catalog);
  parent.addElement(header);

  const matrix = Serializer.createClass(
    "matrixdropdown",
  ) as QuestionMatrixDropdownModel;
  matrix.name = `${header.name}_${CHOICES_ROW_NAME}`;
  matrix.cellType = "comment";
  matrix.titleLocation = "hidden";
  matrix.showHeader = false;
  header.addQuestion(matrix);
  addLocaleColumns(matrix, model);

  const locString = new LocalizableString(matrix, false);
  const translationItem = new TranslationItem(
    CHOICES_ROW_NAME,
    locString,
    "",
    model as never,
    {
      getType: () => "itemvalue",
      name: CHOICES_ROW_NAME,
      value: CHOICES_ROW_NAME,
    },
  );
  translationItem.customText = "Choices";
  translationItem.readOnly = true;
  translationItem.getPlaceholder = (locale: string) =>
    dataListLocaleStatus(catalog, locale);

  const row = new ItemValue(CHOICES_ROW_NAME, "Choices");
  row["translationData"] = translationItem;
  matrix.rows.push(row);
  applyMatrixPlaceholders(matrix);
}

function addLocaleColumns(
  matrix: QuestionMatrixDropdownModel,
  model: TranslationModelLike,
): void {
  // Private on SurveyJS Translation — peek so Translation stays assignable to TranslationModelLike.
  const withColumns = model as TranslationModelLike & {
    addLocaleColumns?: (target: QuestionMatrixDropdownModel) => void;
  };
  if (typeof withColumns.addLocaleColumns === "function") {
    withColumns.addLocaleColumns(matrix);
    return;
  }

  const sample = model.stringsSurvey
    ?.getAllQuestions()
    .find(
      (question) =>
        question.getType() === "matrixdropdown" && question !== matrix,
    ) as QuestionMatrixDropdownModel | undefined;
  if (!sample) {
    matrix.addColumn("default", "Default");
    return;
  }

  for (const column of sample.columns) {
    matrix.addColumn(column.name, column.title);
  }
}

function applyMatrixPlaceholders(matrix: QuestionMatrixDropdownModel): void {
  for (const visibleRow of matrix.visibleRows) {
    const itemValue = ItemValue.getItemByValue(matrix.rows, visibleRow.rowName);
    const item = itemValue?.["translationData"] as
      | TranslationItemLike
      | undefined;
    if (!item?.getPlaceholder) {
      continue;
    }

    for (const cell of visibleRow.cells) {
      const cellQuestion = cell.question as
        | { placeholder?: string }
        | undefined;
      if (!cellQuestion) {
        continue;
      }

      cellQuestion.placeholder = item.getPlaceholder(cell.column.name);
    }
  }
}

function bindPlaceholderRefresh(stringsSurvey: SurveyModel): void {
  const surveyWithFlag = stringsSurvey as SurveyModel & Record<string, unknown>;
  if (surveyWithFlag[PLACEHOLDER_BINDINGS_KEY]) {
    return;
  }

  surveyWithFlag[PLACEHOLDER_BINDINGS_KEY] = true;
  stringsSurvey.onMatrixCellCreated.add((_, options) => {
    if (
      !String(options.question.name).startsWith(DATA_LIST_HEADER_GROUP_PREFIX)
    ) {
      return;
    }

    const itemValue = ItemValue.getItemByValue(
      options.question.rows,
      options.row.rowName,
    );
    const item = itemValue?.["translationData"] as
      | TranslationItemLike
      | undefined;
    if (!item?.getPlaceholder || !options.cell?.question) {
      return;
    }

    options.cell.question.placeholder = item.getPlaceholder(options.columnName);
  });

  stringsSurvey.onAfterRenderQuestion.add((_, options) => {
    if (
      !String(options.question.name).startsWith(DATA_LIST_HEADER_GROUP_PREFIX)
    ) {
      return;
    }

    applyMatrixPlaceholders(options.question as QuestionMatrixDropdownModel);
  });
}

function removeExistingSummaryPanels(stringsSurvey: SurveyModel): void {
  for (const panel of [...stringsSurvey.getAllPanels()]) {
    if (String(panel.name).startsWith(DATA_LIST_HEADER_GROUP_PREFIX)) {
      panel.delete();
    }
  }
}

function bindSummaryPanelChrome(
  stringsSurvey: SurveyModel,
  catalogs: ReadonlyMap<string, DataListTranslationCatalog>,
): void {
  const surveyWithFlag = stringsSurvey as SurveyModel & Record<string, unknown>;
  if (surveyWithFlag[HEADER_BINDINGS_KEY]) {
    return;
  }

  surveyWithFlag[HEADER_BINDINGS_KEY] = true;
  stringsSurvey.onUpdatePanelCssClasses.add((_, options) => {
    if (!String(options.panel.name).startsWith(DATA_LIST_HEADER_GROUP_PREFIX)) {
      return;
    }

    const panelCss = options.cssClasses.panel as PanelCssClasses | undefined;
    if (!panelCss || typeof panelCss !== "object") {
      return;
    }

    if (typeof panelCss.container === "string") {
      panelCss.container += " edx-data-list-translation-header";
    }
    if (typeof panelCss.title === "string") {
      panelCss.title += " edx-data-list-translation-header__title";
    }
    if (typeof panelCss.content === "string") {
      panelCss.content += " edx-data-list-translation-header__content";
    }
  });

  stringsSurvey.onAfterRenderPanel.add((_, options) => {
    enhanceSummaryPanelChrome(options.panel, options.htmlElement, catalogs);
  });
}

function enhanceSummaryPanelChrome(
  panel: PanelModel,
  htmlElement: HTMLElement,
  catalogs: ReadonlyMap<string, DataListTranslationCatalog>,
): void {
  if (!String(panel.name).startsWith(DATA_LIST_HEADER_GROUP_PREFIX)) {
    return;
  }

  const titleEl = htmlElement.querySelector(
    ".st-panel__title, .spg-panel__title",
  ) as HTMLElement | null;
  if (
    !titleEl ||
    titleEl.querySelector(".edx-data-list-translation-header__link")
  ) {
    return;
  }

  titleEl.classList.add("edx-data-list-translation-header__title");

  const dataListId = String(panel.name).slice(
    DATA_LIST_HEADER_GROUP_PREFIX.length,
  );
  const link = document.createElement("a");
  link.className = "edx-data-list-translation-header__link";
  link.href = buildDataListDetailsPath(dataListId);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open data list";
  titleEl.appendChild(link);

  if (!catalogs.has(dataListId)) {
    return;
  }

  const contentEl = htmlElement.querySelector(
    ".st-panel__content, .spg-panel__content",
  );
  if (
    contentEl &&
    !contentEl.querySelector(".edx-data-list-translation-help")
  ) {
    const help = document.createElement("p");
    help.className = "edx-data-list-translation-help";
    help.textContent = DATA_LIST_TRANSLATION_HELP;
    contentEl.insertBefore(help, contentEl.firstChild);
  }
}

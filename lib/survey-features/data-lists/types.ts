import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { Model, SurveyModel } from "survey-core";

export type DataListChoiceItem = { value: string; text: string };

export type DataListChoicePageParams = {
  filter?: string;
  /** SurveyJS searchMode on the bound dropdown/tagbox. */
  searchMode?: "contains" | "startsWith";
  /** Survey locale used to select Labels.default vs a catalog key (e.g. es). */
  locale?: string;
  skip: number;
  take: number;
};

export type PropertyGridChoice = { value: string; text: string };

export type DataListSourceRef = {
  sourceName: string;
  dataListId: string;
};

export type PropertyGridLazyChoiceContext = {
  designerSurvey: SurveyModel;
  propertyGridSurvey: Model;
  editingObj: unknown;
};

export type PropertyGridLazyChoicePageParams = {
  filter?: string;
  skip: number;
  take: number;
};

export type PropertyGridLazyChoiceProvider = {
  propertyName: string;
  shouldEnable: (ctx: PropertyGridLazyChoiceContext) => boolean;
  getStaticChoices?: (
    ctx: PropertyGridLazyChoiceContext,
    filter: string,
  ) => PropertyGridChoice[];
  loadPage: (
    ctx: PropertyGridLazyChoiceContext,
    params: PropertyGridLazyChoicePageParams,
    deps: ExtensionRuntimeDeps,
  ) => Promise<{ items: PropertyGridChoice[]; total: number }>;
  resolveDisplayValues: (
    ctx: PropertyGridLazyChoiceContext,
    values: string[],
    deps: ExtensionRuntimeDeps,
  ) => Promise<string[]>;
};

import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { Question } from "survey-core";
import type {
  PropertyGridChoice,
  PropertyGridLazyChoicePageParams,
} from "../types";
import {
  formatSourceChoiceLabel,
  getDataListSourceRefs,
  getStaticChoicesFromSources,
} from "../utils/property-grid-source-choices";
import { loadChoicesInCreator } from "./load-choices-in-creator";

/**
 * Loads a paged property-grid choice list from survey source questions that may
 * mix static inline choices with one or more data-list powered sources.
 */
export async function loadMultiSourceChoicesInCreator(
  deps: ExtensionRuntimeDeps,
  sources: Question[],
  params: PropertyGridLazyChoicePageParams,
): Promise<{ items: PropertyGridChoice[]; total: number }> {
  const filter = params.filter ?? "";
  const staticItems = getStaticChoicesFromSources(sources, filter);
  const dataListSources = getDataListSourceRefs(sources);

  return loadChoicesInCreator(
    deps,
    dataListSources,
    staticItems,
    params,
    formatSourceChoiceLabel,
  );
}

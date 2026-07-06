import { getLocaleStrings } from "survey-creator-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";

const DATA_LISTS_PAGE_PATH = "/data-lists";

let isCreatorHelpRegistered = false;

export function registerDataListCreatorHelp(): void {
  if (isCreatorHelpRegistered) {
    return;
  }

  const translations = getLocaleStrings("en");

  translations.pehelp[DATA_LIST_PROPERTY_NAME] =
    "Link this question to a shared data list. Recommended when the same options appear on multiple questions: " +
    "define items once, change everywhere, with search and lazy loading for large lists. " +
    `<a target="_blank" rel="noopener noreferrer" class="hover:underline" href="${DATA_LISTS_PAGE_PATH}">Manage data lists</a>.`;

  isCreatorHelpRegistered = true;
}

export function resetDataListCreatorHelpForTests(): void {
  const translations = getLocaleStrings("en");

  delete translations.pehelp[DATA_LIST_PROPERTY_NAME];

  isCreatorHelpRegistered = false;
}

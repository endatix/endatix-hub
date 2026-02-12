/**
 * Country – specialized question (ComponentCollection) for testing the extension framework.
 * Importing this module registers the question type with SurveyJS (side effect).
 */

import { ComponentCollection } from "survey-core";
import type { ExtensionModule } from "@/lib/survey-extensions/types";

const implementation: ExtensionModule = {
  onInit: () => {
    ComponentCollection.Instance.add({
      name: "country",
      title: "Country",
      questionJSON: {
        type: "dropdown",
        placeholder: "Select a country...",
        choicesByUrl: {
          url: "https://surveyjs.io/api/CountriesExample",
        },
      },
      inheritBaseProps: true,
    });
  },
};

export default implementation;

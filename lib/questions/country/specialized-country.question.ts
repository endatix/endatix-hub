import { ICustomQuestionTypeConfiguration } from "survey-core";
import { SpecializedSurveyQuestion } from "../infrastructure/specialized-survey-question";
import { SurveyCreator } from "survey-creator-react";

export class SpecializedCountry extends SpecializedSurveyQuestion {
  get customQuestionConfig(): ICustomQuestionTypeConfiguration {
    return {
      name: "country",
      title: "Country",
      iconName: "icon-dropdown", // Use a suitable icon
      defaultQuestionTitle: "Country Selection",
      questionJSON: {
        type: "dropdown",
        title: "Country",
        description: "Select your country",
        choicesByUrl: {
          url: "https://surveyjs.io/api/CountriesExample",
          valueName: "name",
        },
        placeholder: "Select a country...",
      },
      inheritBaseProps: true,
    };
  }

  static override customizeEditor(creator: SurveyCreator): void {
    // Place the country question in the dropdown category
    creator.toolbox.changeCategory("country", "dropdown");
    
    // Optional: Change the order in the toolbox
    // This places the country question after the standard dropdown
    creator.toolbox.orderedQuestions = ["dropdown", "country"];
  }
}

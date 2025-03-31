import { SurveyCreator } from "survey-creator-react";
import { ICustomQuestionTypeConfiguration } from "survey-core";
import { SpecializedSurveyQuestion } from "./specialized-survey-question";

export interface CustomQuestionConfig {
  name: string;
  title: string;
  iconName: string;
  questionJSON: any;
  defaultQuestionTitle?: string;
  category?: string;
  toolboxOrder?: number;
}

/**
 * Creates a class that extends SpecializedSurveyQuestion from a config object
 */
export function createQuestionClass(config: CustomQuestionConfig) {
  return class extends SpecializedSurveyQuestion {
    get customQuestionConfig(): ICustomQuestionTypeConfiguration {
      return {
        name: config.name,
        title: config.title,
        iconName: config.iconName,
        defaultQuestionTitle: config.defaultQuestionTitle || config.title,
        questionJSON: config.questionJSON,
        inheritBaseProps: true,
      };
    }

    static customizeEditor(creator: SurveyCreator): void {
      // Set category if provided
      if (config.category) {
        creator.toolbox.changeCategory(config.name, config.category);
      }
      
      // Set toolbox order if specified
      if (config.toolboxOrder !== undefined && Array.isArray(creator.toolbox.orderedQuestions)) {
        const orderedQuestions = [...creator.toolbox.orderedQuestions];
        if (!orderedQuestions.includes(config.name)) {
          orderedQuestions.splice(config.toolboxOrder, 0, config.name);
          creator.toolbox.orderedQuestions = orderedQuestions;
        }
      }
    }
  };
} 
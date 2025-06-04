import {
  ComponentCollection,
  ICustomQuestionTypeConfiguration,
  Question,
} from "survey-core";
import { SurveyCreator } from "survey-creator-react";

/**
 * Abstract base class for creating custom question types in SurveyJS.
 * Provides a standardized way to define and register specialized survey questions.
 */
export abstract class SpecializedSurveyQuestion {
  /**
   * Gets the configuration object that defines this custom question type.
   * The configuration specifies properties like name, title, icon, and behavior.
   * Must be implemented by concrete question classes.
   */
  abstract get customQuestionConfig(): ICustomQuestionTypeConfiguration;

  /**
   * Customizes the SurveyCreator toolbox and other editor-specific settings for this question type.
   * Must be implemented as a static method by concrete question classes.
   * @param creator - The SurveyCreator instance to customize
   */
  static customizeEditor(creator: SurveyCreator): void {
    console.error("customizeEditor not implemented", creator);

    throw new Error("customizeEditor method not implemented.");
  }
}

export interface CustomQuestionConfig {
  name: string;
  title: string;
  iconName?: string;
  category?: string;
  orderedAfter?: string;
  defaultQuestionTitle?: string;
  inheritBaseProps?: boolean;
  questionJSON?: Question;
  elementsJSON?: Question[];
  onAfterRenderContentElement?: string;
}

/**
 * Creates a class that extends SpecializedSurveyQuestion from a config object
 * @param config - The configuration of the custom question
 */
export function createCustomQuestionClass(config: CustomQuestionConfig) {
  return class extends SpecializedSurveyQuestion {
    get customQuestionConfig(): ICustomQuestionTypeConfiguration {
      return {
        name: config.name,
        title: config.title,
        iconName: config.iconName,
        defaultQuestionTitle: config.defaultQuestionTitle || config.title,
        inheritBaseProps: config.inheritBaseProps ?? true,
        ...(config.elementsJSON 
          ? { elementsJSON: config.elementsJSON }
          : { questionJSON: config.questionJSON }
        ),
        onAfterRenderContentElement: config.onAfterRenderContentElement 
          ? (new Function(
              'question',
              'element',
              'htmlElement',
              config.onAfterRenderContentElement
            ) as (question: Question, element: Question, htmlElement: HTMLElement) => void)
          : undefined,
      };
    }

    static customizeEditor(creator: SurveyCreator): void {
      if (config.category) {
        creator.toolbox.changeCategory(config.name, config.category);
      }

      if (config.orderedAfter && Array.isArray(creator.toolbox.orderedQuestions)) {
        const orderedQuestions = [...creator.toolbox.orderedQuestions];
        const previousQuestionName = config.orderedAfter;
        const previousIndex = orderedQuestions.indexOf(previousQuestionName);
        
        if (previousIndex !== -1) {
          orderedQuestions.splice(previousIndex + 1, 0, config.name);
        } else {
          orderedQuestions.push(previousQuestionName);
          orderedQuestions.push(config.name);
        }
        
        creator.toolbox.orderedQuestions = orderedQuestions;
      }
    }
  };
}

const customQuestionsRegistry = new Map<string, typeof SpecializedSurveyQuestion>();

/**
 * Initializes custom question classes from JSON data and maintains a registry of created classes.
 * If a question is already registered, returns the existing class instead of creating a new one.
 * @param questions - Array of JSON strings containing custom question configurations
 * @returns Array of initialized question classes
 */
export function initializeCustomQuestions(questions: string[]): (typeof SpecializedSurveyQuestion)[] {
  const questionClasses = questions.map(jsonData => {
    try {
      const parsedJson = JSON.parse(jsonData);
      
      if (customQuestionsRegistry.has(parsedJson.name)) {
        return customQuestionsRegistry.get(parsedJson.name);
      }

      const config: CustomQuestionConfig = {
        name: parsedJson.name,
        title: parsedJson.title,
        iconName: parsedJson.iconName,
        category: parsedJson.category,
        orderedAfter: parsedJson.orderedAfter,
        defaultQuestionTitle: parsedJson.defaultQuestionTitle,
        inheritBaseProps: parsedJson.inheritBaseProps,
        ...(parsedJson.elementsJSON 
          ? { elementsJSON: parsedJson.elementsJSON }
          : { questionJSON: parsedJson.questionJSON }
        ),
        onAfterRenderContentElement: parsedJson.onAfterRenderContentElement 
          ? parsedJson.onAfterRenderContentElement
          : undefined,
      };

      const QuestionClass = createCustomQuestionClass(config);
      registerSpecializedQuestion(QuestionClass);
      customQuestionsRegistry.set(config.name, QuestionClass);
      return QuestionClass;
    } catch (error) {
      console.error('Error registering custom question:', error);
      console.error('Custom question JSON:', jsonData);
      return null;
    }
  }).filter((q): q is typeof SpecializedSurveyQuestion => q !== null);

  return questionClasses;
}

/**
 * Registers a specialized question type with the SurveyJS ComponentCollection.
 * @param questionClass - The specialized question class to register
 */
export function registerSpecializedQuestion(
  questionClass: typeof SpecializedSurveyQuestion,
) {
  const instance =
    new (questionClass as unknown as new () => SpecializedSurveyQuestion)();

  const isQuestionRegistered =
    ComponentCollection.Instance.getCustomQuestionByName(
      instance.customQuestionConfig.name,
    );

  if (!isQuestionRegistered && instance) {
    ComponentCollection.Instance.add(instance.customQuestionConfig);
  }
}

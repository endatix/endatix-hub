import { ComponentCollection, Serializer, ItemValue } from "survey-core";

// Simple config interface for custom questions
export interface CustomQuestionConfig {
  name: string;
  title: string;
  iconName: string;
  questionJSON: any;
  defaultQuestionTitle?: string; 
}

export class SimpleQuestionRegistry {
  // Track registered questions to avoid duplicates
  private static registeredQuestions = new Set<string>();
  
  /**
   * Register a custom question from a config object
   */
  static registerQuestion(config: CustomQuestionConfig): void {
    // Skip if already registered
    if (this.registeredQuestions.has(config.name)) {
      return;
    }
    
    // Check if the question is already registered with SurveyJS
    const existingQuestion = ComponentCollection.Instance.getCustomQuestionByName(config.name);
    
    if (!existingQuestion) {
      // Register the question with SurveyJS
      ComponentCollection.Instance.add({
        name: config.name,
        title: config.title, 
        iconName: config.iconName,
        defaultQuestionTitle: config.defaultQuestionTitle || config.title,
        questionJSON: config.questionJSON,
        inheritBaseProps: true,
      });
      
      // Add choices property if needed
      Serializer.addProperty(config.name, {
        name: "choices:itemvalues",
        onGetValue: function(obj: any) { return ItemValue.getData(obj.choices); },
        onSetValue: function(obj: any, value: any) { obj.choices = value; }
      });
      
      // Mark as registered
      this.registeredQuestions.add(config.name);
    }
  }
  
  /**
   * Register multiple questions at once
   */
  static registerQuestions(configs: CustomQuestionConfig[]): void {
    configs.forEach(config => this.registerQuestion(config));
  }
}

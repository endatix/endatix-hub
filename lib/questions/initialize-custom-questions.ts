import { registerSpecializedQuestion } from "./infrastructure/specialized-survey-question";
import { createQuestionClass, CustomQuestionConfig } from "./infrastructure/create-question-class";

// Sample question configs as JSON strings (simulating database storage)
const questionConfigStrings = [
  `{
    "name": "country",
    "title": "Country",
    "iconName": "icon-dropdown",
    "category": "dropdown",
    "defaultQuestionTitle": "Country Selection",
    "questionJSON": {
      "type": "dropdown",
      "title": "Country",
      "description": "Select your country",
      "choicesByUrl": {
        "url": "https://surveyjs.io/api/CountriesExample",
        "valueName": "name"
      },
      "placeholder": "Select a country..."
    },
    "toolboxOrder": 1
  }`,
  `{
    "name": "usState",
    "title": "US State",
    "iconName": "icon-dropdown",
    "category": "dropdown",
    "defaultQuestionTitle": "State Selection",
    "questionJSON": {
      "type": "dropdown",
      "title": "State",
      "description": "Select your state",
      "choicesByUrl": {
        "url": "https://surveyjs.io/api/CountriesExample",
        "valueName": "name"
      },
      "placeholder": "Select a state..."
    },
    "toolboxOrder": 2
  }`
];

// Initialize outside of React rendering cycle
let initialized = false;

export function initializeCustomQuestions() {
  if (initialized) return;
  
  // Parse the JSON strings (simulating loading from DB)
  const customQuestions: CustomQuestionConfig[] = questionConfigStrings.map(
    jsonString => JSON.parse(jsonString)
  );
  
  // Register all custom questions
  customQuestions.forEach(config => {
    const QuestionClass = createQuestionClass(config);
    registerSpecializedQuestion(QuestionClass);
  });
  
  initialized = true;
}

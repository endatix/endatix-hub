import { Question, Serializer, QuestionFactory } from "survey-core";

export const SCANDIT_QUESTION_TYPE = "scandit";

export class ScanditQuestionModel extends Question {
  getType() {
    return SCANDIT_QUESTION_TYPE;
  }

  public get scanditInputId(): string {
    return this.id + "_scandit";
  }
}

// Register model with Serializer (following SurveyJS pattern)
Serializer.addClass(
  SCANDIT_QUESTION_TYPE,
  [],
  () => new ScanditQuestionModel(""),
  "question",
);

// Register model with QuestionFactory (following SurveyJS pattern)
QuestionFactory.Instance.registerQuestion(SCANDIT_QUESTION_TYPE, (name) => {
  return new ScanditQuestionModel(name);
});

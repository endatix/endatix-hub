import { Serializer, QuestionFactory } from "survey-core";
import { ScanditQuestionModel } from "../scandit/scandit-question-model";

Serializer.addClass("scandit", [], () => new ScanditQuestionModel(""), "question");

QuestionFactory.Instance.registerQuestion("scandit", name => {
  return new ScanditQuestionModel(name);
});
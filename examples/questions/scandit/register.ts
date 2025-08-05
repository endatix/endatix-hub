import { Serializer, QuestionFactory } from "survey-core";
import { ScanditQuestionModel } from "./question-model";

Serializer.addClass("scandit", [], () => new ScanditQuestionModel(""), "question");

QuestionFactory.Instance.registerQuestion("scandit", name => {
  return new ScanditQuestionModel(name);
});

export function registerScanditQuestion() {
  // This function is called when the question is dynamically loaded
  // The registration is already done above, but we can add additional setup here
  console.log("Scandit question registered successfully");
}

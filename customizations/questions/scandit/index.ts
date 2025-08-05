import { ScanditQuestionModel } from "./scandit-question-model";
import { createCustomQuestion } from "@/lib/questions/question-factory";

// Default export for dynamic loading
const scanditQuestion = createCustomQuestion(
  "scandit",
  "Barcode Scanner",
  ScanditQuestionModel,
);

export default scanditQuestion;

// Named exports for direct imports
export { ScanditQuestionModel } from "./scandit-question-model";

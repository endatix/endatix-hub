import { ScanditQuestionModel } from "./question-model";
import { registerScanditQuestion } from "./register";

// Default export for dynamic loading
export default {
  name: "scandit",
  title: "Barcode Scanner",
  iconName: "icon-barcode",
  category: "custom",
  register: registerScanditQuestion,
  model: ScanditQuestionModel,
};

// Named exports for direct imports
export { ScanditQuestionModel } from "./question-model";
export { registerScanditQuestion } from "./register";

import { SvgRegistry } from "survey-core";
import {
  SCANDIT_QUESTION_TYPE,
  ScanditQuestionModel,
} from "./scandit-question-model";
import { createCustomQuestion } from "@/lib/questions/question-factory";

const barcodeIcon =
'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="sv-svg-icon svc-toolbox__item-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>';
SvgRegistry.registerIcon("icon-scandit", barcodeIcon);

const scanditQuestion = createCustomQuestion({
  name: SCANDIT_QUESTION_TYPE,
  title: "Barcode Scanner",
  model: ScanditQuestionModel,
  iconName: "icon-scandit",
  category: "kantar"
});

export default scanditQuestion;

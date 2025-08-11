import { createCustomQuestion } from "@/lib/questions/question-factory";
import {
  COLOR_PICKER_TYPE,
  QuestionColorPickerModel,
} from "./color-picker.question-model";

import "./color-picker.component";

createCustomQuestion({
  name: COLOR_PICKER_TYPE,
  title: "Color Picker",
  iconName: COLOR_PICKER_TYPE,
  model: QuestionColorPickerModel,
});

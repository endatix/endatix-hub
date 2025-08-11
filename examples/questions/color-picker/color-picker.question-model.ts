"use client";

import { ElementFactory, Question, Serializer, SvgRegistry } from "survey-core";
import { editorLocalization } from "survey-creator-core";
import ReactDOMServer from "react-dom/server";
import ColorPickerIcon from "./color-picker-icon";

export const COLOR_PICKER_TYPE = "color-picker";

// A model for the new question type
export class QuestionColorPickerModel extends Question {
  getType() {
    return COLOR_PICKER_TYPE;
  }
  get colorPickerType() {
    return this.getPropertyValue("colorPickerType");
  }
  set colorPickerType(val) {
    this.setPropertyValue("colorPickerType", val);
  }

  get disableAlpha() {
    return this.getPropertyValue("disableAlpha");
  }
  set disableAlpha(val) {
    this.setPropertyValue("disableAlpha", val);
  }
}

ElementFactory.Instance.registerElement(COLOR_PICKER_TYPE, (name: string) => {
  return new QuestionColorPickerModel(name);
});

const locale = editorLocalization.getLocale("");
locale.qt[COLOR_PICKER_TYPE] = "Color Picker";
locale.pe.colorPickerType = "Color picker type";
locale.pe.disableAlpha = "Disable alpha channel";

// Register an SVG icon for the question type
const view = ReactDOMServer.renderToString(ColorPickerIcon);
SvgRegistry.registerIcon(COLOR_PICKER_TYPE, view);

// Add question type metadata for further serialization into JSON
Serializer.addClass(
  COLOR_PICKER_TYPE,
  [
    {
      name: "colorPickerType",
      default: "Slider",
      choices: ["Slider", "Sketch", "Compact"],
      category: "general",
      visibleIndex: 2, // After the Name and Title
    },
    {
      name: "disableAlpha:boolean",
      dependsOn: "colorPickerType",
      visibleIf: function (obj) {
        return obj.colorPickerType === "Sketch";
      },
      category: "general",
      visibleIndex: 3, // After the Name, Title, and Color Picker type
    },
  ],
  function () {
    return new QuestionColorPickerModel("");
  },
  "question",
);

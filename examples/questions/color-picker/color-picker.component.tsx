import { CSSProperties } from "react";
import { PropertyGridEditorCollection } from "survey-creator-react";
import {
  ReactQuestionFactory,
  SurveyQuestionElementBase,
} from "survey-react-ui";
import { COLOR_PICKER_TYPE } from "./color-picker.question-model";
import { CompactPicker, SketchPicker, SliderPicker } from "react-color";
import React from "react";

export class SurveyQuestionColorPicker extends SurveyQuestionElementBase {
  constructor(props: unknown) {
    super(props);
    this.state = { value: this.question.value };
  }
  get question() {
    return this.questionBase;
  }
  get value() {
    return this.question.value;
  }
  get disableAlpha() {
    return this.question.disableAlpha;
  }
  get type() {
    return this.question.colorPickerType;
  }
  handleColorChange = (data: { hex: string }) => {
    this.question.value = data.hex;
  };

  // Support the read-only and design modes
  get style(): CSSProperties {
    return this.question.getPropertyValue("readOnly") ||
      this.question.isDesignMode
      ? { pointerEvents: "none" }
      : {};
  }

  renderColorPicker(type: string) {
    switch (type) {
      case "Slider": {
        return (
          <SliderPicker color={this.value} onChange={this.handleColorChange} />
        );
      }
      case "Sketch": {
        return (
          <SketchPicker
            color={this.value}
            onChange={this.handleColorChange}
            disableAlpha={this.disableAlpha}
          />
        );
      }
      case "Compact": {
        return (
          <CompactPicker color={this.value} onChange={this.handleColorChange} />
        );
      }
      default:
        return <div>Unknown type</div>;
    }
  }

  renderElement() {
    return <div style={this.style}>{this.renderColorPicker(this.type)}</div>;
  }
}

// Register `SurveyQuestionColorPicker` as a class that renders `color-picker` questions
ReactQuestionFactory.Instance.registerQuestion(COLOR_PICKER_TYPE, (props) => {
  return React.createElement(SurveyQuestionColorPicker, props);
});

// Register the `color-picker` as an editor for properties of the `color` type in the Survey Creator's Property Grid
PropertyGridEditorCollection.register({
  fit: function (prop) {
    return prop.type === "color";
  },
  getJSON: function () {
    return {
      type: COLOR_PICKER_TYPE,
      colorPickerType: "Compact",
    };
  },
});

import { RichTextField } from "./rich-text-field";
import "./rich-text-editor.styles.scss";
import {
  SurveyQuestionElementBase,
  ReactQuestionFactory,
} from "survey-react-ui";
import React from "react";
import { ItemValue } from "survey-core";
import { RICH_TEXT_EDITOR_TYPE } from "./rich-text-editor.model";

export class RichTextEditorComponent extends SurveyQuestionElementBase {

  constructor(props: unknown) {
    super(props);
    this.state = { value: this.question.value };
  }

  get question() {
    return this.questionBase;
  }

  handleValueChange = (value: string) => {
    if (value !== this.question.value) this.question.value = value;
  };

  get style() {
    return { height: this.question.height };
  }

  get isChoiceLabel() {
    const { name, obj } = this.question;
    return name === "text" && obj instanceof ItemValue && obj.ownerPropertyName === "choices";
  }

  renderField() {
    const isReadOnly = this.question.isReadOnly || this.question.isDesignMode;
    return (
      <div
        id={`rich-text-${this.question.id}`}
        aria-label="Rich text editor"
        className="rich-text-editor"
      >
        <RichTextField
          key={`${this.question.obj?.uniqueId}:${this.question.obj?.getLocale?.()}`}
          choiceLabel={this.isChoiceLabel}
          readOnly={isReadOnly}
          value={this.question.value}
          onChange={this.handleValueChange}
        />
      </div>
    );
  }

  renderElement() {
    return <div style={this.style}>{this.renderField()}</div>;
  }
}

/**
 * Register the rich text editor question in the Survey JS
 */
export function registerRichTextEditorQuestion() {
  ReactQuestionFactory.Instance.registerQuestion(
    RICH_TEXT_EDITOR_TYPE,
    (props) => React.createElement(RichTextEditorComponent, props),
  );
}

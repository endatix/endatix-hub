import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.bubble.css";
import "./rich-text-editor.styles.scss";
import {
    SurveyQuestionElementBase,
    ReactQuestionFactory
} from "survey-react-ui";
import React from "react";
import {
  RICH_TEXT_EDITOR_TYPE
} from "./rich-text-editor.model";

const modules = {
        toolbar: [
            // Group 1: Headings and Font
            // [{ 'header': [1, 2, false] }],
            // [{ 'font': [] }],
            
            // Group 2: Basic Formatting
            // ['bold', 'italic', 'underline', 'strike'], // toggled buttons
            ['bold', 'italic', 'underline', 'strike', { 'color': [] }, { 'background': [] }, 'image']
            
            // Group 3: Lists and Indentation
            // [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            // [{ 'indent': '-1'}, { 'indent': '+1' }],
            
            // Group 4: Links/Images and Alignment
            // ['link', 'image'],
            // [{ 'align': [] }],
            
            // Group 5: Clear formatting
            // ['clean']
            ],
    };

function normalizeHtmlValue(value: string): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (
    trimmed === "<p><br></p>" ||
    trimmed === "<p><br /></p>" ||
    /^<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>$/i.test(trimmed)
  ) {
    return "";
  }
  return value;
}

export class RichTextEditorComponent extends SurveyQuestionElementBase {
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
    handleValueChange = (val: string) => {
        this.question.value = normalizeHtmlValue(val);
    };
    get style() {
        return { height: this.question.height };
    }

    renderQuill() {
        const isReadOnly = this.question.isReadOnly || this.question.isDesignMode;
        return (
            <div className="relative border border-gray-300 rounded-md p-0">
                <ReactQuill
                    theme="bubble"
                    readOnly={isReadOnly}
                    value={this.value}
                    onChange={this.handleValueChange}
                    modules={modules}
                />
            </div>
        );
    }

    renderElement() {
        return <div style={this.style}>{this.renderQuill()}</div>;
    }
}

export function registerRichTextEditor() {
  ReactQuestionFactory.Instance.registerQuestion(
    RICH_TEXT_EDITOR_TYPE,
    (props) => {
      return React.createElement(RichTextEditorComponent, props);
    },
  );
}
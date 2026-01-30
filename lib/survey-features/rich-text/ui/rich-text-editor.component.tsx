import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.bubble.css";
import "./rich-text-editor.styles.scss";
import {
  SurveyQuestionElementBase,
  ReactQuestionFactory,
} from "survey-react-ui";
import React from "react";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { RICH_TEXT_EDITOR_TYPE } from "./rich-text-editor.model";

/**
 * Toolbar options for the rich text editor.
 */
const FORMATTING_OPTIONS = {
  headingsAndFont: [{ header: [1, 2, false] }, { font: [] }],
  basic: [
    "bold",
    "italic",
    "underline",
    "strike",
    { color: [] },
    { background: [] },
    "image",
  ],
  listsAndIndentation: [
    { list: "ordered" },
    { list: "bullet" },
    { indent: "-1" },
    { indent: "+1" },
  ],
  linksAndImagesAndAlignment: ["link", "image", { align: [] }],
  clearFormatting: ["clean"],
};

const modules = {
  toolbar: [FORMATTING_OPTIONS.basic],
};

/** Normalizes HTML value for the question (empty -> '', else sanitized). Exported for tests. */
export function normalizeHtmlValue(value: string): string {
  if (!value) return "";
  return htmlSanitizer.sanitize(value);
}

export class RichTextEditorComponent extends SurveyQuestionElementBase {
  wrapperRef = React.createRef<HTMLDivElement>();
  quillRef = React.createRef<ReactQuill>();

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

  hasActiveSelection(): boolean {
    return hasActiveSelectionFromEditor(this.quillRef.current?.editor);
  }

  hideTooltip(): void {
    hideTooltipFromEditor(this.quillRef.current?.editor);
  }

  handleBlur = () => {
    if (this.hasActiveSelection()) {
      this.hideTooltip();
    }
  };

  handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && this.hasActiveSelection()) {
      this.hideTooltip();
    }
  };

  renderQuill() {
    const isReadOnly = this.question.isReadOnly || this.question.isDesignMode;
    const hasActiveSelection = this.hasActiveSelection();
    return (
      <div
        ref={this.wrapperRef}
        role="group"
        aria-label="Rich text editor"
        className={`relative border border-gray-300 rounded-md p-0 ${hasActiveSelection ? "rich-text-editor--active" : ""}`}
        onBlur={this.handleBlur}
        onKeyDown={this.handleKeyDown}
      >
        <ReactQuill
          ref={this.quillRef}
          theme="bubble"
          readOnly={isReadOnly}
          value={this.value}
          onChange={this.handleValueChange}
          modules={modules}
          bounds={this.wrapperRef.current ?? undefined}
        />
      </div>
    );
  }

  renderElement() {
    return <div style={this.style}>{this.renderQuill()}</div>;
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

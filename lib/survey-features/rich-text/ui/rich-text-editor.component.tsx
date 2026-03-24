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
import {
  hasActiveSelectionFromEditor,
  hideTooltipFromEditor,
} from "./rich-text-editor.utils";

const NON_BREAKING_SPACE_REGEX = /&nbsp;|\xA0/gi;
const SINGLE_PARAGRAPH_REGEX = /^<p>(((?!<\/?p>).)*)<\/p>$/i;
const WHITESPACE = " ";
const QUILL_USER_EVENT_SOURCE = "api";

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
export function normalizeAndSanitize(value: string): string {
  if (!value) return "";

  const processed = value.replaceAll(NON_BREAKING_SPACE_REGEX, WHITESPACE);

  const sanitized = htmlSanitizer.sanitize(processed);

  const match = SINGLE_PARAGRAPH_REGEX.exec(sanitized);
  if (match && match.length > 1) {
    return match[1].trim();
  }

  return sanitized.trim();
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

  handleValueChange = (val: string, _: any, source: string) => {
    if (source !== QUILL_USER_EVENT_SOURCE) {
      return;
    }

    const normalizedNewValue = normalizeAndSanitize(val);

    const normalizedCurrentValue = this.question.value
      ? normalizeAndSanitize(this.question.value)
      : "";

    if (normalizedNewValue !== normalizedCurrentValue) {
      this.question.value = normalizedNewValue;
    }
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
        aria-label="Rich text editor"
        className={`relative rounded-md border border-gray-300 p-0 ${hasActiveSelection ? "rich-text-editor--active" : ""}`}
      >
        <ReactQuill
          ref={this.quillRef}
          theme="bubble"
          readOnly={isReadOnly}
          value={this.value}
          onChange={this.handleValueChange}
          modules={modules}
          onBlur={this.handleBlur}
          onKeyDown={this.handleKeyDown}
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

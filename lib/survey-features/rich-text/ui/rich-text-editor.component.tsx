import ReactQuill from "react-quill-new";
import { UploadableQuill } from "./uploadable-quill";
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
import { normalizeWhitespace, unwrapSingleParagraph } from "../rich-text-utils";

export const QUILL_USER_EVENT_SOURCE = "user";

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

  const normalized = normalizeWhitespace(value);

  const sanitized = htmlSanitizer.sanitize(normalized);

  return unwrapSingleParagraph(sanitized);
}

export class RichTextEditorComponent extends SurveyQuestionElementBase {
  quillRef = React.createRef<ReactQuill>();
  private lastUserEdit?: { html: string; value: string };

  constructor(props: unknown) {
    super(props);
    this.state = { value: this.question.value };
  }

  get question() {
    return this.questionBase;
  }

  get value() {
    const value = this.question.value;
    // Quill wraps paragraphs; SurveyJS stores sanitized inline HTML. Echoing the
    // latter back on each keystroke resets Quill's selection and undo history.
    if (this.lastUserEdit && this.lastUserEdit.value === value) return this.lastUserEdit.html;
    return value;
  }

  handleValueChange = (val: string, _: any, source: string) => {
    if (source !== QUILL_USER_EVENT_SOURCE) {
      return;
    }

    const normalizedNewValue = normalizeAndSanitize(val);
    this.lastUserEdit = { html: val, value: normalizedNewValue };

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
        id={`rich-text-${this.question.id}`}
        aria-label="Rich text editor"
        className={`rich-text-editor ${hasActiveSelection ? "rich-text-editor--active" : ""}`}
      >
        <UploadableQuill
          editorRef={this.quillRef}
          theme="bubble"
          readOnly={isReadOnly}
          value={this.value}
          onChange={this.handleValueChange}
          modules={modules}
          onBlur={this.handleBlur}
          onKeyDown={this.handleKeyDown}
          bounds={`#rich-text-${this.question.id}`}
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

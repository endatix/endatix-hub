import { PropertyGridEditorCollection } from "survey-creator-react";
import { registerRichTextEditorQuestion } from "./ui/rich-text-editor.component";
import { RICH_TEXT_EDITOR_TYPE } from "./ui/rich-text-editor.model";

let isInitialized = false;

/**
 * Register the rich text editor question and extends the Survey Creator's Property Grid to include the rich text editor question.
 */
export function registerRichTextEditor() {
  if (isInitialized) {
    return;
  }

  registerRichTextEditorQuestion();

  PropertyGridEditorCollection.register({
    fit: (prop) => {
      return (
        prop.name === "description" ||
        prop.name === "title" ||
        prop.name === "text"
      );
    },
    getJSON: () => {
      return { type: RICH_TEXT_EDITOR_TYPE, name: "rich-text-editor" };
    },
  });

  isInitialized = true;
}

export default registerRichTextEditor;

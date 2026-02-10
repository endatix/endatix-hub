import { PropertyGridEditorCollection } from "survey-creator-react";
import { registerRichTextEditorQuestion } from "./ui/rich-text-editor.component";
import { RICH_TEXT_EDITOR_TYPE } from "./ui/rich-text-editor.model";

let isInitialized = false;

/**
 * Registers the rich text editor for the Survey Creator property grid only.
 * It is used as an augmenting editor for description/title/text in the property grid.
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

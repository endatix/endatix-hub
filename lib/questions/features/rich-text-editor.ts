import { PropertyGridEditorCollection } from "survey-creator-react";
import {RICH_TEXT_EDITOR_TYPE} from "../rich-text-editor/rich-text-editor.model";
import { registerRichTextEditor } from "../rich-text-editor/rich-text-editor.component";

let isInitialized = false;

function addRichTextEditorFeature() {
    if (isInitialized) {
        return;
    }

    registerRichTextEditor();

    PropertyGridEditorCollection.register({
        fit: (prop) => {
            return prop.name === "description" || prop.name === "title" || prop.name === "text";
        },
        getJSON: () => { return { type: RICH_TEXT_EDITOR_TYPE, name: "rich-text-editor" } }
    });

    isInitialized = true;
}

export default addRichTextEditorFeature;
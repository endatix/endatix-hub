import { ElementFactory, Question, QuestionFactory, Serializer } from "survey-core";

export const RICH_TEXT_EDITOR_TYPE = "richtexteditor";

export class RichTextEditorModel extends Question {
    getType() {
        return RICH_TEXT_EDITOR_TYPE;
    }
    get height() {
        return this.getPropertyValue("height");
    }
    set height(val) {
        this.setPropertyValue("height", val);
    }
}

ElementFactory.Instance.registerElement(RICH_TEXT_EDITOR_TYPE, (name) => {
    return new RichTextEditorModel(name);
});

Serializer.addClass(
    RICH_TEXT_EDITOR_TYPE,
    [{ name: "max-height", default: "200px", category: "layout" }],
    function () {
        return new RichTextEditorModel("");
    },
    "question"
);

QuestionFactory.Instance.registerQuestion(
  RICH_TEXT_EDITOR_TYPE,
  (name: string) => {
    return new RichTextEditorModel(name);
  },
);
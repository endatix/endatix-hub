import { SurveyModel, TextMarkdownEvent } from "survey-core";
import MarkdownIt from "markdown-it";

export function registerMarkdownRenderer(surveyModel: SurveyModel): () => void {
  const converter = MarkdownIt({ html: true });
  const handler = (_sender: unknown, options: TextMarkdownEvent) => {
    options.html = converter.renderInline(options.text);
  };

  surveyModel.onTextMarkdown.add(handler);

  return () => {
    surveyModel.onTextMarkdown.remove(handler);
  };
}
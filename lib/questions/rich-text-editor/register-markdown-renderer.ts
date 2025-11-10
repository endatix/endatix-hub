import { SurveyModel } from "survey-core";
import MarkdownIt from "markdown-it";

export function registerMarkdownRenderer(surveyModel: SurveyModel) {
  const converter = MarkdownIt({ html: true });
  const handler = (_sender: unknown, options: any) => {
    options.html = converter.renderInline(options.text);
  };

  surveyModel.onTextMarkdown.add(handler);

  return () => {
    surveyModel.onTextMarkdown.remove(handler);
  };
}


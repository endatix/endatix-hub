import { SurveyModel, TextMarkdownEvent } from "survey-core";
import MarkdownIt from "markdown-it";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
});

export function registerMarkdownRenderer(surveyModel: SurveyModel): () => void {
  const handler = (_sender: unknown, options: TextMarkdownEvent) => {
    if (!options?.text) return;

    const renderedString = markdownIt.render(options.text);

    const sanitizedString = htmlSanitizer.sanitize(renderedString);
    options.html = sanitizedString;
  };

  surveyModel.onTextMarkdown.add(handler);

  return () => {
    surveyModel.onTextMarkdown.remove(handler);
  };
}

import { SurveyModel, TextMarkdownEvent } from "survey-core";
import MarkdownIt from "markdown-it";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { unwrapSingleParagraph } from "./rich-text-utils";

const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
});

export function registerMarkdownRenderer(surveyModel: SurveyModel): () => void {
  const handler = (_sender: unknown, options: TextMarkdownEvent) => {
    if (!options?.text) return;

    const rawHtml = markdownIt.renderInline(options.text);

    const sanitized = htmlSanitizer.sanitize(rawHtml);
    const unwrapped = unwrapSingleParagraph(sanitized);

    options.html = unwrapped;
  };

  surveyModel.onTextMarkdown.add(handler);

  return () => {
    surveyModel.onTextMarkdown.remove(handler);
  };
}

import { RichText } from "@/components/common/rich-text";
import { collectAuthorChoiceTexts } from "@/lib/questions/author-choice-texts";
import {
  extractReplacedTokens,
  Token,
} from "@/lib/questions/personalization/reverse-text-processor";
import { Result } from "@/lib/result";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { ISurvey, SurveyModel } from "survey-core";

/** A question or panel whose title can pipe values (`{var}`, `{panel.x}`). */
export interface PipedTitleSource {
  title: string;
  processedTitle: string;
  survey: ISurvey | null;
  getProcessedText(text: string): string;
}

const authorTextsBySurvey = new WeakMap<object, Set<string>>();

function authorTextsOf(survey: ISurvey | null): Set<string> {
  if (!survey) {
    return new Set();
  }
  let texts = authorTextsBySurvey.get(survey);
  if (!texts) {
    texts = collectAuthorChoiceTexts((survey as SurveyModel).toJSON());
    authorTextsBySurvey.set(survey, texts);
  }
  return texts;
}

interface AuthorTextProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "children" | "dangerouslySetInnerHTML"
> {
  value: string;
  survey: ISurvey | null;
}

/**
 * Renders a value as rich text only when the form author wrote it (a choice
 * text from the definition). A respondent's answer, or any other piped value,
 * renders as plain text, so it can never add links or images to the page.
 */
export function AuthorText({ value, survey, ...props }: AuthorTextProps) {
  if (authorTextsOf(survey).has(value)) {
    return <RichText html={value} {...props} />;
  }
  return <span {...props}>{htmlSanitizer.toPlainText(value)}</span>;
}

/**
 * Splits a piped title into author pieces and piped values, resolving each
 * variable on its own so a value with spaces is not cut at the next piece.
 * Returns null when the split is unsafe (a static piece ends inside a tag) or
 * does not rebuild the processed title.
 */
export function resolvePipedTokens(source: PipedTitleSource): Token[] | null {
  const extracted = extractReplacedTokens(source.title, source.processedTitle);
  if (Result.isError(extracted)) {
    return null;
  }
  const tokens = resolveEach(extracted.value, source);
  const rebuilt = tokens
    .map((token) => (token.isVariable ? token.replacedValue : token.value))
    .join("");
  return rebuilt === source.processedTitle && !cutsThroughTag(tokens)
    ? tokens
    : null;
}

function resolveEach(tokens: Token[], source: PipedTitleSource): Token[] {
  return tokens.map((token) =>
    token.isVariable
      ? {
          ...token,
          replacedValue: source.getProcessedText(`{${token.value}}`),
        }
      : token,
  );
}

function cutsThroughTag(tokens: Token[]): boolean {
  return tokens.some(
    (token) =>
      !token.isVariable &&
      token.value.lastIndexOf("<") > token.value.lastIndexOf(">"),
  );
}

/**
 * A piped title without chips (panel headers): author pieces rich, piped
 * values through `AuthorText`, plain text when the title cannot be split.
 */
export function PipedText({ source }: { source: PipedTitleSource }) {
  if (source.processedTitle === source.title) {
    return <RichText html={source.title} />;
  }
  const tokens = resolvePipedTokens(source);
  if (!tokens) {
    return <span>{htmlSanitizer.toPlainText(source.processedTitle)}</span>;
  }
  return <PipedPieces tokens={tokens} survey={source.survey} />;
}

interface PipedPiecesProps {
  tokens: Token[];
  survey: ISurvey | null;
}

function PipedPieces({ tokens, survey }: PipedPiecesProps) {
  return <span>{tokens.map((token) => pipedPiece(token, survey))}</span>;
}

function pipedPiece(token: Token, survey: ISurvey | null) {
  if (token.isVariable && !token.replacedValue) {
    return null;
  }
  return token.isVariable ? (
    <AuthorText
      key={token.id}
      value={token.replacedValue ?? ""}
      survey={survey}
    />
  ) : (
    <RichText key={token.id} html={token.value} />
  );
}

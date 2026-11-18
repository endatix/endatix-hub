import { RichText } from "@/components/common/rich-text";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  extractReplacedTokens,
  Token,
} from "@/lib/questions/personalization/reverse-text-processor";
import { getPanelTitle } from "@/lib/questions/question-utils";
import { Result } from "@/lib/result";
import { cn } from "@/lib/utils";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { useMemo } from "react";
import { Question } from "survey-core";
import {
  useSubmissionDetailsViewOptions,
  ViewOption,
} from "./submission-details-context";

interface QuestionLabelProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  forQuestion: Question;
}

export function QuestionLabel({
  forQuestion,
  className,
  ...props
}: QuestionLabelProps) {
  const { viewOptions } = useSubmissionDetailsViewOptions();
  // Not memoized: the title follows the model's label locale.
  const panelTitle = htmlSanitizer.toPlainText(
    getPanelTitle(forQuestion) ?? "",
  );

  if (!forQuestion) {
    return null;
  }
  const processedTitle = forQuestion.processedTitle;
  const originalTitle = forQuestion.title;
  const isPersonalized =
    processedTitle?.length > 0 && processedTitle !== originalTitle;

  return (
    <div className={cn("w-full min-w-0", className)} {...props}>
      {isPersonalized && viewOptions[ViewOption.ShowPersonalized] ? (
        <PersonalizedTextLabel question={forQuestion} />
      ) : (
        <TextLabel question={forQuestion} />
      )}

      {panelTitle && (
        <p className="text-xs text-muted-foreground">{panelTitle}</p>
      )}
    </div>
  );
}

// A block label: the shared Label is flex, which would lay every inline piece
// of a rich title out as its own column.
const labelClass = "block leading-normal";

function TextLabel({ question, html }: { question: Question; html?: string }) {
  return (
    <Label htmlFor={question.name} className={labelClass}>
      <RichText html={html ?? question.title ?? ""} />
    </Label>
  );
}

/**
 * True when a piece ends inside a tag (`<img src="{url}">`, or a piped value
 * the tokenizer split at a space), so the pieces cannot be sanitized one by one.
 */
function cutsThroughTag(tokens: Token[]): boolean {
  return tokens.some((token) => {
    const text = token.isVariable
      ? (token.replacedValue ?? token.value)
      : token.value;
    return text.lastIndexOf("<") > text.lastIndexOf(">");
  });
}

function PersonalizedTextLabel({ question }: { question: Question }) {
  const extractionTokensResult = useMemo(
    () => extractReplacedTokens(question.title, question.processedTitle),
    [question.title, question.processedTitle],
  );

  if (
    Result.isError(extractionTokensResult) ||
    cutsThroughTag(extractionTokensResult.value)
  ) {
    return <TextLabel question={question} html={question.processedTitle} />;
  }

  const personalizedTokens = extractionTokensResult.value;

  return (
    <TooltipProvider>
      <Label htmlFor={question.name} className={labelClass}>
        {personalizedTokens.map((token: Token) =>
          token.isVariable ? (
            <Tooltip key={token.id}>
              <TooltipTrigger asChild>
                <RichText
                  html={token.replacedValue ?? token.value}
                  className="rounded-md bg-primary/10 box-decoration-clone px-1.5 py-0.5 font-bold"
                  tabIndex={0}
                  role="button"
                  aria-describedby={`${question.name}-tooltip`}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={10}
                id={`${question.name}-tooltip`}
              >
                <p>
                  @variable: <b>&#123;{token.value}&#125;</b>
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <RichText key={token.id} html={token.value} />
          ),
        )}
      </Label>
    </TooltipProvider>
  );
}

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
import { useSubmissionDetailsViewOptions, ViewOption } from "./submission-details-context";

interface QuestionLabelProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  forQuestion: Question;
}

export function QuestionLabel({
  forQuestion,
  className,
  ...props
}: QuestionLabelProps) {
  const panelTitle = useMemo(() => getPanelTitle(forQuestion), [forQuestion]);
  const { viewOptions } = useSubmissionDetailsViewOptions();

  if (!forQuestion) {
    return null;
  }
  const processedTitle = forQuestion.processedTitle;
  const originalTitle = forQuestion.title;
  const isPersonalized =
    processedTitle?.length > 0 && processedTitle !== originalTitle;

  return (
    <div className={cn("col-span-2 justify-items-end", className)} {...props}>
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

function TextLabel({ question }: { question: Question }) {
  const title = question.title ?? "";
  const sanitized = useMemo(() => htmlSanitizer.sanitizeInline(title), [title]);

  return (
    <Label
      htmlFor={question.name}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function PersonalizedTextLabel({ question }: { question: Question }) {
  const extractionTokensResult = useMemo(
    () => extractReplacedTokens(question.title, question.processedTitle),
    [question.title, question.processedTitle],
  );

  if (Result.isError(extractionTokensResult)) {
    return <TextLabel question={question} />;
  }

  const personalizedTokens = extractionTokensResult.value;

  return (
    <TooltipProvider>
      <Label htmlFor={question.name}>
        {personalizedTokens.map((token: Token) =>
          token.isVariable ? (
            <Tooltip key={token.id}>
              <TooltipTrigger asChild>
                <span
                  className="rounded-md bg-primary/10 p-1.5 font-bold"
                  tabIndex={0}
                  role="button"
                  aria-describedby={`${question.name}-tooltip`}
                >
                  {token.replacedValue ?? token.value}
                </span>
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
            <span
              key={token.id}
              dangerouslySetInnerHTML={{
                __html: htmlSanitizer.sanitizeInline(token.value),
              }}
            />
          ),
        )}
      </Label>
    </TooltipProvider>
  );
}

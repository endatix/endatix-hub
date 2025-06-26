import { Question } from "survey-core";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Result } from "@/lib/result";
import { useSubmissionDetailsViewOptions } from './submission-details-view-options-context';
import { getPanelTitle } from '@/lib/questions/question-utils';
import { extractReplacedTokens, Token } from '@/lib/questions/personalization/reverse-text-processor';

interface QuestionLabelProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  forQuestion: Question;
}

export function QuestionLabel({
  forQuestion,
  className,
  ...props
}: QuestionLabelProps) {
  const panelTitle = useMemo(() => getPanelTitle(forQuestion), [forQuestion]);
  const { options } = useSubmissionDetailsViewOptions();

  if (!forQuestion) {
    return null;
  }
  const processedTitle = forQuestion.processedTitle;
  const originalTitle = forQuestion.title;
  const isPersonalized =
    processedTitle?.length > 0 && processedTitle !== originalTitle;

  return (
    <div className={cn("text-right col-span-2", className)} {...props}>
      {isPersonalized && options.showDynamicVariables ? (
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
  return <Label htmlFor={question.name}>{question.title}</Label>;
}

function PersonalizedTextLabel({ question }: { question: Question }) {
  const extractionTokensResult = useMemo(
    () => extractReplacedTokens(question.title, question.processedTitle),
    [question.title, question.processedTitle]
  );

  if (Result.isError(extractionTokensResult)) {
    return <TextLabel question={question} />;
  }

  const personalizedTokens = extractionTokensResult.value;

  return (
    <TooltipProvider>
      <Label htmlFor={question.name}>
        {personalizedTokens.map((token: Token, index: number) =>
          token.isVariable ? (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  className="font-bold bg-primary/10 p-1.5 rounded-md"
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
            <span key={index}>{token.value}</span>
          )
        )}
      </Label>
    </TooltipProvider>
  );
}

import { Question } from "survey-core";
import { PanelModel } from "survey-core";
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

interface QuestionLabelProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  forQuestion: Question;
}

const getPanelTitle = (question: Question) => {
  const panel = question.parent;

  if (panel instanceof PanelModel) {
    return panel.processedTitle ?? panel.title;
  }

  if (panel.isPage) {
    return panel.shortcutText ?? "";
  }

  return "";
};

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

interface TextPreProcessorItem {
  start: number;
  end: number;
}

interface Token {
  value: string;
  isVariable: boolean;
  replacedValue?: string;
}

const isValidItemName = (name: string) => {
  return name.length > 0 && name.length < 100;
};

function TextLabel({ question }: { question: Question }) {
  return <Label htmlFor={question.name}>{question.title}</Label>;
}

function PersonalizedTextLabel({ question }: { question: Question }) {
  const extractReplacedTokens = (
    text: string,
    processedText: string,
  ): Result<Token[]> => {
    const tokens: Token[] = [];

    if (text === processedText) {
      return Result.validationError("No personalized tokens found");
    }

    const items: TextPreProcessorItem[] = [];
    const length = text.length;
    let start = -1;
    let ch = "";
    for (let i = 0; i < length; i++) {
      ch = text[i];
      if (ch == "{") start = i;
      if (ch == "}") {
        if (start > -1) {
          const item: TextPreProcessorItem = {
            start,
            end: i,
          };
          if (isValidItemName(text.substring(start + 1, i - 1))) {
            items.push(item);
          }
        }
        start = -1;
      }
    }

    const numItems = items.length;
    for (let i = 0; i < numItems; i++) {
      const item = items[i];
      if (i == 0) {
        tokens.push({
          value: text.substring(0, item.start),
          isVariable: false,
        });
      }
      tokens.push({
        value: text.substring(item.start + 1, item.end),
        isVariable: true,
      });

      if (i == numItems - 1) {
        const lastToken = text.substring(item.end + 1);
        if (lastToken.length > 0) {
          tokens.push({
            value: lastToken,
            isVariable: false,
          });
        }
      }
    }

    let processedTextMap = processedText;
    const numTokens = tokens.length;
    for (let i = 0; i < numTokens; i++) {
      const token = tokens[i];
      if (!token?.isVariable) {
        const areTokensEqual =
          processedTextMap.substring(0, token.value.length) === token.value;
        if (!areTokensEqual) {
          return Result.error("Error extracting persinalized tokens");
        }
        processedTextMap = processedTextMap.substring(token.value.length);
      } else {
        if (i == numTokens - 1) {
          token.replacedValue = processedTextMap;
        } else {
          const nextToken = tokens[i + 1];
          const indexOfNextToken = processedTextMap.indexOf(nextToken.value);
          if (indexOfNextToken > -1) {
            token.replacedValue = processedTextMap.substring(
              0,
              indexOfNextToken,
            );
          } else {
            return Result.error("Error extracting persinalized tokens");
          }
        }
      }
    }
    return Result.success(tokens);
  };

  const extractionTokensResult = extractReplacedTokens(
    question.title,
    question.processedTitle,
  );

  if (Result.isError(extractionTokensResult)) {
    return <TextLabel question={question} />;
  }

  const personalizedTokens = extractionTokensResult.value;

  return (
    <TooltipProvider>
      <Label htmlFor={question.name}>
        {personalizedTokens.map((token, index) =>
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
          ),
        )}
      </Label>
    </TooltipProvider>
  );
}

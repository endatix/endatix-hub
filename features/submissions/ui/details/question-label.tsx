import { RichText } from "@/components/common/rich-text";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Token } from "@/lib/questions/personalization/reverse-text-processor";
import { getPanelTitle } from "@/lib/questions/question-utils";
import { cn } from "@/lib/utils";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { Question } from "survey-core";
import {
  useSubmissionDetailsViewOptions,
  ViewOption,
} from "./submission-details-context";
import { AuthorText, resolvePipedTokens } from "./piped-text";

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

function TextLabel({ question }: { question: Question }) {
  return (
    <Label htmlFor={question.name} className={labelClass}>
      <RichText html={question.title ?? ""} />
    </Label>
  );
}

/** An empty piped value shows no chip. */
function hasText(token: Token): boolean {
  return !token.isVariable || (token.replacedValue ?? "").length > 0;
}

function PersonalizedTextLabel({ question }: { question: Question }) {
  // Not memoized: processedTitle follows piped values on the same question.
  const personalizedTokens = resolvePipedTokens(question);

  if (!personalizedTokens) {
    return (
      <Label htmlFor={question.name} className={labelClass}>
        {htmlSanitizer.toPlainText(question.processedTitle)}
      </Label>
    );
  }

  return (
    <TooltipProvider>
      <Label htmlFor={question.name} className={labelClass}>
        {personalizedTokens
          .filter((token) => hasText(token))
          .map((token: Token) =>
            token.isVariable ? (
              <Tooltip key={token.id}>
                <TooltipTrigger asChild>
                  <AuthorText
                    value={token.replacedValue ?? ""}
                    survey={question.survey}
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

import { Question, QuestionCustomModel } from "survey-core";
import { PanelModel } from "survey-core";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const processedTitle = useMemo(() => {
    if (forQuestion instanceof QuestionCustomModel) {
      return (
        forQuestion.contentQuestion?.processedTitle ??
        forQuestion.contentQuestion?.title
      );
    }

    return forQuestion.processedTitle ?? forQuestion.title;
  }, [forQuestion]);

  return (
    <div className={cn("text-right col-span-2", className)} {...props}>
      <Label htmlFor={forQuestion.name}>{processedTitle}</Label>
      {panelTitle && (
        <p className="text-xs text-muted-foreground">{panelTitle}</p>
      )}
    </div>
  );
}

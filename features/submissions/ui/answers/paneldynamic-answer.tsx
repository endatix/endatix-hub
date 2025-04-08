import { PanelModel, Question, QuestionPanelDynamicModel } from "survey-core";
import AnswerViewer from "./answer-viewer";
import { Captions, CaptionsOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionLabel } from '../details/question-label';

interface PanelDynamicAnswerProps {
  question: QuestionPanelDynamicModel;
  className?: string;
}

const PanelDynamicAnswer = ({
  question,
  className,
}: PanelDynamicAnswerProps) => {
  const panels: PanelModel[] = question.panels;
  if (panels.length === 0) {
    return (
      <div className={cn(className, "flex flex-row gap-2")}>
        <CaptionsOff className="h-4 w-4" />
        <p className="text-sm font-medium text-muted-foreground">
          There are no panels filled
        </p>
      </div>
    );
  }

  return (
    <div className={cn(className, "flex flex-col gap-2 items-start")}>
      {panels.map((panel, index) => (
        <div key={panel.id} className="flex flex-col gap-2">
          <h4 className="flex flex-row gap-2 text-sm font-medium text-muted-foreground border-b border-color-bg-accent pb-1">
            <Captions className="h-4 w-4" />
            {panel.title ? panel.title : "Panel " + (index + 1)}
          </h4>
          <div className="flex flex-col gap-2 w-full">
            {panel.getQuestions(true).map((question) => (
              <>
                <QuestionLabel
                  forQuestion={question}
                  className="text-sm font-medium text-muted-foreground justify-start text-left"
                />
                <AnswerViewer key={question.id} forQuestion={question} />
              </>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PanelDynamicAnswer;

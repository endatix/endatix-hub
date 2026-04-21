import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Captions, CaptionsOff } from "lucide-react";
import { PanelModel, QuestionPanelDynamicModel } from "survey-core";
import { QuestionLabel } from "../details/question-label";
import AnswerViewer from "./answer-viewer";

interface PanelDynamicAnswerProps {
  question: QuestionPanelDynamicModel;
  className?: string;
}

const panelSubgroupClass =
  "w-full min-w-0 rounded-[6px] bg-surface-container-lowest/60 p-4 shadow-[0_1px_0_rgb(0,52,94,0.04)] dark:bg-surface-container-high/25 dark:shadow-none";

const PanelDynamicAnswer = ({
  question,
  className,
}: PanelDynamicAnswerProps) => {
  const panels: PanelModel[] = question.panels;
  if (panels.length === 0) {
    return (
      <div
        className={cn(
          "flex w-full min-w-0 flex-row items-center gap-2",
          className,
        )}
      >
        <CaptionsOff className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          There are no panels filled
        </p>
      </div>
    );
  }

  if (panels.length === 1) {
    return (
      <div className={cn("flex w-full min-w-0 flex-col", className)}>
        <div className={panelSubgroupClass}>
          <Panel panel={panels[0]} />
        </div>
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 border-none",
        className,
      )}
      defaultValue={panels.map((panel) => panel.id)}
    >
      {panels.map((panel, index) => (
        <AccordionItem value={panel.id} key={panel.id} className="border-0">
          <AccordionTrigger
            className={cn(
              "rounded-[6px] bg-surface-container-low/70 px-4 py-3 hover:no-underline",
              "dark:bg-surface-container/40",
              "data-[state=open]:rounded-b-none data-[state=open]:bg-surface-container-low",
              "dark:data-[state=open]:bg-surface-container",
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <Captions className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 text-sm font-semibold tracking-tight text-foreground">
                {panel.processedTitle
                  ? panel.processedTitle
                  : `Dynamic panel ${index + 1}`}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="w-full min-w-0 pt-0">
            <div className={cn(panelSubgroupClass, "rounded-t-none")}>
              <Panel panel={panel} />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

const Panel = ({ panel }: { panel: PanelModel }) => {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {panel.getQuestions(false).map((q) => (
        <div key={q.id} className="flex w-full min-w-0 flex-col gap-1.5">
          <QuestionLabel
            forQuestion={q}
            className="text-left text-sm font-medium text-muted-foreground"
          />
          <AnswerViewer forQuestion={q} className="w-full min-w-0" />
        </div>
      ))}
    </div>
  );
};

export default PanelDynamicAnswer;

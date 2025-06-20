import { PanelModel, QuestionPanelDynamicModel } from "survey-core";
import AnswerViewer from "./answer-viewer";
import { Captions, CaptionsOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionLabel } from "../details/question-label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  if (panels.length === 1) {
    return (
      <div className={cn(className, "flex flex-col gap-2 items-start w-full")}>
        <Panel key={panels[0].id} panel={panels[0]} />
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      className={cn(
        className,
        "flex flex-col gap-2 items-start w-full border-none",
      )}
      defaultValue={panels.map((panel) => panel.id)}
    >
      {panels.map((panel, index) => (
        <AccordionItem value={panel.id} key={panel.id}>
          <AccordionTrigger className="flex flex-row gap-2 text-left hover:bg-transparent w-full justify-start items-center border-none">
            <Captions className="h-4 w-4" />
            {panel.processedTitle
              ? panel.processedTitle
              : "Dynamic Panel " + (index + 1)}
          </AccordionTrigger>
          <AccordionContent>
            <Panel key={panel.id} panel={panel} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

const Panel = ({ panel }: { panel: PanelModel }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {panel.getQuestions(false).map((question) => (
        <div key={question.id} className="flex flex-col gap-1">
          <QuestionLabel
            forQuestion={question}
            className="text-sm font-medium text-muted-foreground justify-start text-left"
          />
          <AnswerViewer key={question.id} forQuestion={question} />
        </div>
      ))}
    </div>
  );
};

export default PanelDynamicAnswer;

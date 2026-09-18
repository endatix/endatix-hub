import CopyToClipboard from "@/components/copy-to-clipboard";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MessageSquareOff, MessageSquareText } from "lucide-react";
import React, { useEffect, useRef, useMemo } from "react";
import { Question } from "survey-core";

interface CommentAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

const CommentIcon = ({ hasComment }: { hasComment: boolean }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        {hasComment ? (
          <MessageSquareText aria-label="Comment" className="mr-1 h-4 w-4" />
        ) : (
          <MessageSquareOff aria-label="Comment" className="mr-1 h-4 w-4" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {hasComment
            ? "Comment provided from user"
            : "No comment provided from user"}
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const CommentContent = ({ question }: { question: Question }) => (
  <Label
    htmlFor={question.name}
    className="text-sm font-medium text-muted-foreground"
  >
    Comment
  </Label>
);

const NoCommentContent = () => (
  <span className="text-sm font-medium text-muted-foreground">No comment</span>
);

const CommentAnswer = ({ question, className }: CommentAnswerProps) => {
  const hasComment = question.value?.length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOversized = useMemo(
    () => question.value?.length > 1000,
    [question.value],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || isOversized) {
      return;
    }

    el.style.height = "auto";
    el.style.height = el.scrollHeight + 4 + "px";
  }, [question.value, isOversized]);

  return (
    <div
      className={cn(
        "flex w-auto flex-col items-start justify-start gap-1",
        className,
      )}
    >
      <div className="flex flex-row justify-start text-sm text-muted-foreground">
        <CommentIcon hasComment={hasComment} />
        {hasComment ? (
          <CommentContent question={question} />
        ) : (
          <NoCommentContent />
        )}
      </div>
      {hasComment && (
        <div className="flex w-full items-start gap-1">
          <Textarea
            ref={textareaRef}
            id={question.name}
            disabled
            rows={1}
            className={cn(
              "min-h-6 min-w-0 flex-1 resize-none pl-2 text-sm",
              isOversized && "h-auto",
            )}
            value={question.value}
          />
          <CopyToClipboard
            copyValue={() => question.value ?? "N/A"}
            label="Copy comment"
            layout="inline"
            className="mt-0.5 text-muted-foreground"
          />
        </div>
      )}
    </div>
  );
};

export default CommentAnswer;

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
import React, { useEffect, useRef, useMemo, useState } from "react";
import { Question } from "survey-core";
import { useDebouncedResize } from "@/lib/utils/hooks/use-debounced-resize";

interface CommentAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

const CommentIcon = ({ hasComment }: { hasComment: boolean }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        {hasComment ? (
          <MessageSquareText aria-label="Comment" className="w-4 h-4 mr-1" />
        ) : (
          <MessageSquareOff aria-label="Comment" className="w-4 h-4 mr-1" />
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
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const isOversized = useMemo(
    () => question.value?.length > 1000,
    [question.value],
  );

  const checkScrollbar = () => {
    const el = textareaRef.current;
    if (!el) return;

    setHasScrollbar(el.scrollHeight > el.clientHeight);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    if (!isOversized) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + 4 + "px";
    }

    checkScrollbar();
  }, [question.value, isOversized]);

  useDebouncedResize({
    onResize: checkScrollbar,
  });

  return (
    <div
      className={cn(
        "flex items-start justify-start flex-col gap-1 w-auto",
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
        <div className="relative w-full">
          <CopyToClipboard
            copyValue={() => question.value ?? "N/A"}
            label="Copy comment"
            className={cn(
              "absolute right-2.5 top-4 h-4 w-4 text-muted-foreground cursor-pointer z-10",
              hasScrollbar && "right-5",
            )}
          />
          <Textarea
            ref={textareaRef}
            id={question.name}
            disabled
            rows={1}
            className={cn(
              "text-sm min-h-6 resize-none pl-2 pr-8",
              isOversized && "h-auto",
              hasScrollbar && "pr-8",
            )}
            value={question.value}
          />
        </div>
      )}
    </div>
  );
};

export default CommentAnswer;

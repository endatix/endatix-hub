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
import React from "react";
import { Question } from "survey-core";

interface CommentAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

const CommentIcon = ({ hasComment }: { hasComment: boolean }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        {hasComment ? (
          <MessageSquareText aria-label="Comment" className="w-4 h-4 mr-2" />
        ) : (
          <MessageSquareOff aria-label="Comment" className="w-4 h-4 mr-2" />
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
  <Label htmlFor={question.name}>Comment</Label>
);

const NoCommentContent = () => (
  <span className="text-sm font-medium">No comment</span>
);

const CommentAnswer = ({ question, className }: CommentAnswerProps) => {
  const hasComment = question.value?.length > 0;

  return (
    <div
      className={cn(
        "flex items-start justify-start flex-col gap-2 w-full",
        className,
      )}
    >
      <div className="flex flex-row items-center justify-start text-muted-foreground">
        <CommentIcon hasComment={hasComment} />
        {hasComment ? (
          <CommentContent question={question} />
        ) : (
          <NoCommentContent />
        )}
      </div>
      {hasComment && (
        <Textarea
          id={question.name}
          disabled
          className="text-sm min-h-6"
          value={question.value}
        />
      )}
    </div>
  );
};

export default CommentAnswer;

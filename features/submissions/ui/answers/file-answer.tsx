"use client";

import { SubmissionFileDialog } from "@/features/asset-storage/use-cases/get-user-file/ui/submission-file-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { QuestionFileModel } from "survey-core";
import { IFile } from "@/lib/questions/file/file-type";
import { FileViewer } from "./file-viewer";
import { ImageOff, MessageSquareText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface FileAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: QuestionFileModel;
}

export function FileAnswer({ question, className, ...props }: FileAnswerProps) {
  const files: IFile[] = Array.isArray(question?.value) ? question?.value : [];
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (files.length === 0) {
    return (
      <div className={cn("col-span-5", className)} {...props}>
        <div className="flex items-center justify-start space-x-4 pb-1 text-sm text-muted-foreground">
          <ImageOff className="mr-2 h-4 w-4" />
          No files uploaded
        </div>
      </div>
    );
  }

  return (
    <div className={cn("col-span-5", className)} {...props}>
      <div className="flex flex-wrap items-start gap-4 text-sm">
        {files.map((file, index) => (
          <FileViewer
            key={`${index}-${file.name}`}
            file={file}
            size="small"
            onOpen={() => {
              setSelectedFile(file);
              setIsDialogOpen(true);
            }}
          />
        ))}
      </div>
      <SubmissionFileDialog
        file={selectedFile}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
      {question?.supportComment() && question.hasComment && (
        <div className="mt-4 flex items-center justify-start">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <MessageSquareText
                  aria-label="Comment"
                  className="mr-2 h-4 w-4"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Comment</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-sm text-muted-foreground">
            {question.comment}
          </span>
        </div>
      )}
    </div>
  );
}

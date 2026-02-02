import { FileQuestion } from "lucide-react";

interface SubmissionFilesErrorProps {
  message: string;
}

export function SubmissionFilesError({ message }: SubmissionFilesErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
      <FileQuestion className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

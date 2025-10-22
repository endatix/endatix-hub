"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, X } from "lucide-react";
import { useState } from "react";

interface SubmissionAlertMessageProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
}

const SubmissionAlertMessage = ({
  title,
  description,
  ...props
}: SubmissionAlertMessageProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <Alert className="w-auto relative flex items-center" {...props}>
      <AlertCircleIcon className="h-4 w-4 mr-2" />
      <AlertTitle className="text-sm font-medium">{title}</AlertTitle>
      <AlertDescription className="text-sm">{description}</AlertDescription>
      <div className="flex justify-end absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss"
          onClick={() => setIsVisible(false)}
          className="mt-2 relative"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default SubmissionAlertMessage;

import { cn } from "@/lib/utils";
import * as React from "react";

interface ErrorMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  message?: string | string[];
}

const ErrorMessage = React.forwardRef<HTMLParagraphElement, ErrorMessageProps>(
  ({ className, message, ...props }, ref) => {
    if (!message || (Array.isArray(message) && message.length === 0)) {
      return null;
    }

    // Handle single error message
    if (typeof message === "string") {
      return (
        <p
          ref={ref}
          className={cn("text-sm font-medium text-destructive", className)}
          {...props}
        >
          {message}
        </p>
      );
    }
    // Handle multiple error messages
    return (
      <div className="space-y-1">
        {message.map((error, index) => (
          <p
            key={index}
            ref={index === 0 ? ref : undefined}
            className={cn("text-sm font-medium text-destructive", className)}
            {...props}
          >
            {error}
          </p>
        ))}
      </div>
    );
  },
);

ErrorMessage.displayName = "FormErrorMessage";

export { ErrorMessage, type ErrorMessageProps };

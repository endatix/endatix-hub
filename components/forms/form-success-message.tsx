import { CircleCheckBig } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface FormSuccessMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  message: string;
  variant?: "default" | "compact";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

function FormSuccessMessage({
  title = "Success",
  message = "The operation was successful.",
  variant = "default",
  children,
  icon = <CircleCheckBig className="w-8 h-8 text-green-500" />,
  ...props
}: FormSuccessMessageProps) {
  if (variant === "compact") {
    return (
      <Alert variant="default" {...props}>
        <AlertTitle className="flex items-center gap-2">
          {icon} {title}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          {message}
          {children && <AlertActions>{children}</AlertActions>}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4" {...props}>
      <div className="flex items-center justify-center gap-3 mb-2">
        {icon}
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground text-center">{message}</p>
      {children && <AlertActions>{children}</AlertActions>}
    </div>
  );
}

function AlertActions({ children }: { children: React.ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      {children}
    </div>
  );
}

export default FormSuccessMessage;

import { ShieldX } from "lucide-react";

interface ForbiddenPageProps {
  forbiddenTitle?: string;
  forbiddenSubtitle?: string;
  forbiddenMessage?: string;
  children?: React.ReactNode;
}

const DEFAULT_FORBIDDEN_TITLE = "403";
const DEFAULT_FORBIDDEN_SUBTITLE = "Access Denied";
const DEFAULT_FORBIDDEN_MESSAGE =
  "You don't have permission to access this page. Please contact your administrator if you believe this is an error.";

export const ForbiddenComponent: React.FC<ForbiddenPageProps> = ({
  forbiddenTitle = DEFAULT_FORBIDDEN_TITLE,
  forbiddenSubtitle = DEFAULT_FORBIDDEN_SUBTITLE,
  forbiddenMessage = DEFAULT_FORBIDDEN_MESSAGE,
  children,
}) => {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-16 text-center">
      <h1 className="endatix-error-h1 text-9xl text-primary mb-4">
        {forbiddenTitle}
      </h1>
      <div className="inline-block mb-4">
        <h2 className="text-2xl font-bold mb-8">{forbiddenSubtitle}</h2>
      </div>
      <ShieldIcon />
      <p className="mt-2 text-muted-foreground">{forbiddenMessage}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

const ShieldIcon = () => {
  return (
    <div className="flex justify-center mb-6">
      <div className="bg-red-100 p-6 rounded-full">
        <ShieldX className="h-16 w-16 text-red-600" />
      </div>
    </div>
  );
};

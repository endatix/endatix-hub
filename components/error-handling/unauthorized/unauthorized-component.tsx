import { ShieldX } from "lucide-react";

interface UnauthorizedPageProps {
  unauthorizedTitle?: string;
  unauthorizedSubtitle?: string;
  unauthorizedMessage?: string;
  children?: React.ReactNode;
}

const DEFAULT_UNAUTHORIZED_TITLE = "403";
const DEFAULT_UNAUTHORIZED_SUBTITLE = "Access Denied";
const DEFAULT_UNAUTHORIZED_MESSAGE =
  "You don't have permission to access this page. Please contact your administrator if you believe this is an error.";

export const UnauthorizedComponent: React.FC<UnauthorizedPageProps> = ({
  unauthorizedTitle = DEFAULT_UNAUTHORIZED_TITLE,
  unauthorizedSubtitle = DEFAULT_UNAUTHORIZED_SUBTITLE,
  unauthorizedMessage = DEFAULT_UNAUTHORIZED_MESSAGE,
  children,
}) => {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-16 text-center">
      <h1 className="endatix-error-h1 text-9xl text-primary mb-4">
        {unauthorizedTitle}
      </h1>
      <div className="inline-block mb-4">
        <h2 className="text-2xl font-bold mb-8">{unauthorizedSubtitle}</h2>
      </div>
      <ShieldIcon />
      <p className="mt-2 text-muted-foreground">{unauthorizedMessage}</p>
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

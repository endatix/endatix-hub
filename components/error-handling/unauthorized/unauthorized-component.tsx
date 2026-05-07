import { ShieldX } from "lucide-react";

interface UnauthorizedPageProps {
  unauthorizedTitle?: string;
  unauthorizedSubtitle?: string;
  unauthorizedMessage?: string;
  children?: React.ReactNode;
  variant?: "page" | "card";
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
  variant = "page",
}) => {
  const isCard = variant === "card";

  return (
    <div
      className={
        isCard
          ? "bg-card mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-xl border px-6 py-12 text-center shadow-sm"
          : "mx-auto flex h-full max-w-xl flex-col items-center justify-center py-16 text-center"
      }
    >
      <h1
        className={
          isCard
            ? "endatix-error-h1 mb-4 text-7xl text-primary"
            : "endatix-error-h1 mb-4 text-9xl text-primary"
        }
      >
        {unauthorizedTitle}
      </h1>
      <div className="mb-4 inline-block">
        <h2 className={isCard ? "mb-6 text-xl font-bold" : "mb-8 text-2xl font-bold"}>
          {unauthorizedSubtitle}
        </h2>
      </div>
      <ShieldIcon compact={isCard} />
      <p className={isCard ? "mt-2 max-w-md text-sm text-muted-foreground" : "mt-2 text-muted-foreground"}>
        {unauthorizedMessage}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

const ShieldIcon = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className="mb-6 flex justify-center">
      <div className={compact ? "rounded-full bg-red-100 p-4" : "rounded-full bg-red-100 p-6"}>
        <ShieldX className={compact ? "h-12 w-12 text-red-600" : "h-16 w-16 text-red-600"} />
      </div>
    </div>
  );
};

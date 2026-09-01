import { ErrorPage } from "@/components/error-handling/error-page";
import { cn } from "@/lib/utils";

interface UnauthorizedPageProps {
  /** Short label above the headline. */
  unauthorizedTitle?: string;
  unauthorizedSubtitle?: string;
  unauthorizedMessage?: string;
  children?: React.ReactNode;
  /** `card` embeds the same chrome inside a settings panel instead of a full page. */
  variant?: "page" | "card";
}

const DEFAULT_UNAUTHORIZED_TITLE = "Access denied";
const DEFAULT_UNAUTHORIZED_SUBTITLE =
  "You do not have permission to view this page.";
const DEFAULT_UNAUTHORIZED_MESSAGE =
  "Contact your administrator if you believe this is a mistake.";

/**
 * 403 chrome. Shares `ErrorPage` — and therefore the sheep, the watermark and the
 * type scale — with every other Hub error, rather than the red shield it used to
 * render, which was the only error surface that looked like a different product.
 */
export const UnauthorizedComponent: React.FC<UnauthorizedPageProps> = ({
  unauthorizedTitle = DEFAULT_UNAUTHORIZED_TITLE,
  unauthorizedSubtitle = DEFAULT_UNAUTHORIZED_SUBTITLE,
  unauthorizedMessage = DEFAULT_UNAUTHORIZED_MESSAGE,
  children,
  variant = "page",
}) => {
  const isCard = variant === "card";

  const errorPage = (
    <ErrorPage
      code="403"
      eyebrow={unauthorizedTitle}
      title={unauthorizedSubtitle}
      message={unauthorizedMessage}
      className={cn(
        // A panel inside settings sets its own bounds; don't claim 70vh of it.
        isCard && "min-h-0 gap-6 py-8",
      )}
    >
      {children}
    </ErrorPage>
  );

  if (!isCard) {
    return errorPage;
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card shadow-sm">
      {errorPage}
    </div>
  );
};

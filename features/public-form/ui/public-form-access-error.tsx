import {
  RETURN_URL_PARAM,
  SIGNIN_PATH,
} from "@/features/auth/infrastructure/auth-constants";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import type { PublicSurveyVariant } from "@/features/public-form/types";
import { getErrorMessageWithFallback } from "@/lib/endatix-api/shared/error-codes";
import { withBasePath } from "@/lib/hosting";
import {
  ClipboardX,
  LockKeyhole,
  ShieldX,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  PublicStatusPage,
  publicStatusClassNames,
  type PublicStatusTone,
} from "@/components/public-status/public-status-page";

export type PublicFormAccessErrorKind =
  | "unauthorized"
  | "forbidden"
  | "formUnavailable"
  | "accessLoadError";

type AccessErrorPresentation = {
  icon: LucideIcon;
  tone: PublicStatusTone;
  title: string;
  message: string;
};

const UNAUTHORIZED: AccessErrorPresentation = {
  icon: LockKeyhole,
  tone: "neutral",
  title: "Sign in required",
  message: "You must be signed in to access this form.",
};

const FORBIDDEN: AccessErrorPresentation = {
  icon: ShieldX,
  tone: "neutral",
  title: "Access denied",
  message: "You don't have permission to access this form.",
};

export type PublicFormAccessErrorProps = {
  kind: PublicFormAccessErrorKind;
  formId: string;
  variant: PublicSurveyVariant;
  urlToken?: string;
  errorCode?: string;
  /** Host ProblemDetails title. Used only for `formUnavailable`. */
  title?: string;
  /** Host ProblemDetails detail. Used only for `formUnavailable`. */
  message?: string;
};

export function buildPublicFormSignInHref({
  formId,
  variant,
  urlToken,
}: Pick<
  PublicFormAccessErrorProps,
  "formId" | "variant" | "urlToken"
>): string {
  const formPath = withBasePath(
    variant === "embed" ? `/embed/${formId}` : `/share/${formId}`,
  );
  const returnUrl = urlToken
    ? `${formPath}?token=${encodeURIComponent(urlToken)}`
    : formPath;

  return `${withBasePath(SIGNIN_PATH)}?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}`;
}

function getPresentation({
  kind,
  errorCode,
  title,
  message,
}: Pick<
  PublicFormAccessErrorProps,
  "kind" | "errorCode" | "title" | "message"
>): AccessErrorPresentation {
  switch (kind) {
    case "unauthorized":
      return UNAUTHORIZED;
    case "formUnavailable":
      // Host copy is all-or-nothing: half a host message next to half of ours reads
      // as two authors. Without both, it is an ordinary denial.
      return title && message
        ? { icon: ClipboardX, tone: "neutral", title, message }
        : FORBIDDEN;
    case "accessLoadError":
      return {
        icon: TriangleAlert,
        tone: "warning",
        title: "Unable to load form",
        message: getErrorMessageWithFallback(
          errorCode,
          "Please try again later.",
        ),
      };
    default:
      return FORBIDDEN;
  }
}

export function PublicFormAccessError({
  kind,
  formId,
  variant,
  urlToken,
  errorCode,
  title,
  message,
}: Readonly<PublicFormAccessErrorProps>) {
  const isEmbed = variant === "embed";
  const presentation = getPresentation({ kind, errorCode, title, message });

  return (
    <>
      {isEmbed && <EmbedHeightReporter />}
      <PublicStatusPage {...presentation} layout={isEmbed ? "embed" : "page"}>
        {kind === "unauthorized" && (
          <a
            className={publicStatusClassNames.action}
            href={buildPublicFormSignInHref({
              formId,
              variant,
              urlToken,
            })}
            {...(isEmbed ? { target: "_top" } : {})}
          >
            Sign in
          </a>
        )}
      </PublicStatusPage>
    </>
  );
}

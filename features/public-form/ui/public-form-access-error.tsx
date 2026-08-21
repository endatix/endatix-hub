import { RETURN_URL_PARAM, SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import type { PublicSurveyVariant } from "@/features/public-form/types";
import { getErrorMessageWithFallback } from "@/lib/endatix-api/shared/error-codes";
import { withBasePath } from "@/lib/hosting";
import { ShieldX } from "lucide-react";
import emptyState from "./already-responded.module.css";
import styles from "./public-form-access-error.module.css";

export type PublicFormAccessErrorKind =
  | "unauthorized"
  | "forbidden"
  | "accessLoadError";

const COPY: Record<
  Exclude<PublicFormAccessErrorKind, "accessLoadError">,
  {
    title: string;
    subtitle: string;
    message: string;
  }
> = {
  unauthorized: {
    title: "401",
    subtitle: "Sign in required",
    message: "You must be signed in to access this form.",
  },
  forbidden: {
    title: "403",
    subtitle: "Access denied",
    message: "You don't have permission to access this form.",
  },
};

export type PublicFormAccessErrorProps = {
  kind: PublicFormAccessErrorKind;
  formId: string;
  variant: PublicSurveyVariant;
  urlToken?: string;
  errorCode?: string;
};

export function buildPublicFormSignInHref({
  formId,
  variant,
  urlToken,
}: Omit<PublicFormAccessErrorProps, "kind" | "errorCode">): string {
  const formPath = withBasePath(
    variant === "embed" ? `/embed/${formId}` : `/share/${formId}`,
  );
  const returnUrl = urlToken
    ? `${formPath}?token=${encodeURIComponent(urlToken)}`
    : formPath;

  return `${withBasePath(SIGNIN_PATH)}?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}`;
}

function getCopy(
  kind: PublicFormAccessErrorKind,
  errorCode?: string,
): { title: string; subtitle: string; message: string } {
  if (kind === "accessLoadError") {
    return {
      title: "Unable to load form",
      subtitle: "Something went wrong",
      message: getErrorMessageWithFallback(
        errorCode,
        "Please try again later.",
      ),
    };
  }

  return COPY[kind];
}

export function PublicFormAccessError({
  kind,
  formId,
  variant,
  urlToken,
  errorCode,
}: Readonly<PublicFormAccessErrorProps>) {
  const copy = getCopy(kind, errorCode);
  const isEmbed = variant === "embed";

  return (
    <div className={emptyState.container}>
      {isEmbed && <EmbedHeightReporter />}
      <div className={emptyState.content}>
        <h1 className={emptyState.title}>{copy.title}</h1>
        <h2 className={styles.subtitle}>{copy.subtitle}</h2>
        <div className={styles.iconWrapper}>
          <ShieldX className={styles.icon} size={48} strokeWidth={1.8} />
        </div>
        <p className={emptyState.message}>{copy.message}</p>
        {kind === "unauthorized" && (
          <a
            className={styles.signInLink}
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
      </div>
    </div>
  );
}

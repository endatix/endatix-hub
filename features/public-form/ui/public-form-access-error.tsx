import { RETURN_URL_PARAM, SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import type { PublicSurveyVariant } from "@/features/public-form/types";
import { ShieldX } from "lucide-react";
import styles from "./public-form-access-error.module.css";

export type PublicFormAccessErrorKind = "unauthorized" | "forbidden";

const COPY: Record<
  PublicFormAccessErrorKind,
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
};

export function buildPublicFormSignInHref({
  formId,
  variant,
  urlToken,
}: Omit<PublicFormAccessErrorProps, "kind">): string {
  const formPath = variant === "embed" ? `/embed/${formId}` : `/share/${formId}`;
  const returnUrl = urlToken
    ? `${formPath}?token=${encodeURIComponent(urlToken)}`
    : formPath;

  return `${SIGNIN_PATH}?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}`;
}

export function PublicFormAccessError({
  kind,
  formId,
  variant,
  urlToken,
}: Readonly<PublicFormAccessErrorProps>) {
  const copy = COPY[kind];
  const isEmbed = variant === "embed";

  return (
    <div className={styles.container}>
      {isEmbed && <EmbedHeightReporter />}
      <div className={styles.content}>
        <h1 className={styles.title}>{copy.title}</h1>
        <h2 className={styles.subtitle}>{copy.subtitle}</h2>
        <div className={styles.iconWrapper}>
          <ShieldX className={styles.icon} size={48} strokeWidth={1.8} />
        </div>
        <p className={styles.message}>{copy.message}</p>
        {kind === "unauthorized" && (
          <a
            className={styles.signInLink}
            href={buildPublicFormSignInHref({
              formId,
              variant,
              urlToken,
            })}
          >
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}

import { getIsomorphicEndatixConfig } from "@/features/config/client-endatix-config";
import type { LucideIcon } from "lucide-react";
import styles from "./public-status-page.module.css";

/**
 * `success` — the reader is done (submitted, already responded).
 * `neutral` — the page cannot do what was asked, and nothing is broken
 * (closed, denied, expired, not found, sign-in).
 * `warning` — something failed and trying again later may help.
 */
export type PublicStatusTone = "success" | "neutral" | "warning";

/**
 * `page` owns the viewport (share, view, edit, export error).
 * `embed` sits inside a customer's iframe and sizes to its content.
 */
export type PublicStatusLayout = "page" | "embed";

export interface PublicStatusPageProps {
  icon: LucideIcon;
  tone: PublicStatusTone;
  title: string;
  /**
   * One or two sentences. Pass an array when the copy arrives as separate pieces
   * (operator-configured maintenance text) so each keeps its own paragraph.
   */
  message?: string | readonly string[];
  /** One quieter line under the message: what to do next. */
  note?: string;
  layout: PublicStatusLayout;
  /**
   * Forces the "Powered by Endatix" line on or off. Omit to follow
   * `ENDATIX_SHOW_POWERED_BY` (shown unless set to `false`).
   */
  showPoweredBy?: boolean;
  /** At most one action, plus an optional support reference. */
  children?: React.ReactNode;
}

/** Class names for content passed as `children`, so callers match the page. */
export const publicStatusClassNames = {
  action: styles.action,
  reference: styles.reference,
  referenceCode: styles.referenceCode,
  referenceButton: styles.referenceButton,
} as const;

export const POWERED_BY_URL =
  "https://endatix.com/?utm_source=endatix-hub&utm_medium=powered-by";

/**
 * Shared chrome for every page a non-Hub reader lands on instead of what they came
 * for — a form respondent, a submission-link recipient, an export recipient.
 *
 * These pages render under a customer's brand, so Endatix appears only as the quiet
 * "Powered by" line: no mascot, no brand colour, no HTTP status. `page` follows the
 * OS colour scheme; `embed` stays light, like the survey it replaces
 * (DESIGN.md §6, Public status pages).
 */
export function PublicStatusPage({
  icon: Icon,
  tone,
  title,
  message,
  note,
  layout,
  showPoweredBy,
  children,
}: Readonly<PublicStatusPageProps>) {
  const isPoweredByShown =
    showPoweredBy ?? getIsomorphicEndatixConfig().showPoweredBy;

  return (
    <div className={`${styles.root} ${styles[layout]} ${styles[tone]}`}>
      <div className={styles.content}>
        <div className={styles.iconBadge}>
          <Icon aria-hidden className={styles.icon} strokeWidth={1.75} />
        </div>
        <h1 className={styles.title}>{title}</h1>
        {toParagraphs(message).map((paragraph, index) => (
          // Static copy that never reorders; text can repeat, so it is not a key.
          <p className={styles.message} key={index}>
            {paragraph}
          </p>
        ))}
        {children}
        {note ? <p className={styles.note}>{note}</p> : null}
      </div>
      {isPoweredByShown ? (
        <p className={styles.poweredBy}>
          Powered by{" "}
          <a href={POWERED_BY_URL} rel="noopener" target="_blank">
            Endatix
          </a>
        </p>
      ) : null}
    </div>
  );
}

function toParagraphs(message: PublicStatusPageProps["message"]): string[] {
  const parts = typeof message === "string" ? [message] : (message ?? []);
  return parts.filter((part) => part.trim() !== "");
}

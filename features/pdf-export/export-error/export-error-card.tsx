import {
  Clock,
  FileQuestion,
  Hourglass,
  ServerCrash,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  PublicStatusPage,
  type PublicStatusTone,
} from "@/components/public-status/public-status-page";
import { PublicStatusReference } from "@/components/public-status/public-status-reference";
import {
  EXPORT_ERROR_CODE,
  type ExportErrorContent,
  type ExportErrorCode,
} from "@/features/pdf-export/export-error-content";

const ICONS: Readonly<Record<ExportErrorCode, LucideIcon>> = {
  [EXPORT_ERROR_CODE.TIMEOUT]: Clock,
  [EXPORT_ERROR_CODE.UPSTREAM]: ServerCrash,
  [EXPORT_ERROR_CODE.EXPIRED]: Hourglass,
  [EXPORT_ERROR_CODE.FORBIDDEN]: ShieldAlert,
  [EXPORT_ERROR_CODE.NOT_FOUND]: FileQuestion,
  [EXPORT_ERROR_CODE.INVALID]: TriangleAlert,
  [EXPORT_ERROR_CODE.UNKNOWN]: TriangleAlert,
};

/** A failure worth retrying is `warning`; a link that will never work is `neutral`. */
const TONES: Readonly<Record<ExportErrorCode, PublicStatusTone>> = {
  [EXPORT_ERROR_CODE.TIMEOUT]: "warning",
  [EXPORT_ERROR_CODE.UPSTREAM]: "warning",
  [EXPORT_ERROR_CODE.EXPIRED]: "neutral",
  [EXPORT_ERROR_CODE.FORBIDDEN]: "neutral",
  [EXPORT_ERROR_CODE.NOT_FOUND]: "neutral",
  [EXPORT_ERROR_CODE.INVALID]: "neutral",
  [EXPORT_ERROR_CODE.UNKNOWN]: "warning",
};

interface ExportErrorCardProps {
  content: ExportErrorContent;
  reference: string | null;
}

export function ExportErrorCard({
  content,
  reference,
}: Readonly<ExportErrorCardProps>) {
  return (
    <PublicStatusPage
      icon={ICONS[content.key]}
      layout="page"
      message={content.description}
      note={content.hint}
      title={content.title}
      tone={TONES[content.key]}
    >
      {reference && <PublicStatusReference reference={reference} />}
    </PublicStatusPage>
  );
}

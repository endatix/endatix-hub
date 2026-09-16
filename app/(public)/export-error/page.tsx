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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cookies } from "next/headers";
import {
  EXPORT_ERROR_CODE,
  getExportErrorContent,
  type ExportErrorCode,
} from "@/features/pdf-export/export-error-content";
import {
  EXPORT_RETRY_COOKIE,
  parseExportRetryTarget,
} from "@/features/pdf-export/export-retry-target";
import { RetryExportButton } from "@/features/pdf-export/export-error/retry-export-button";

const ICONS: Readonly<Record<ExportErrorCode, LucideIcon>> = {
  [EXPORT_ERROR_CODE.TIMEOUT]: Clock,
  [EXPORT_ERROR_CODE.UPSTREAM]: ServerCrash,
  [EXPORT_ERROR_CODE.EXPIRED]: Hourglass,
  [EXPORT_ERROR_CODE.FORBIDDEN]: ShieldAlert,
  [EXPORT_ERROR_CODE.NOT_FOUND]: FileQuestion,
  [EXPORT_ERROR_CODE.INVALID]: TriangleAlert,
  [EXPORT_ERROR_CODE.UNKNOWN]: TriangleAlert,
};

function retryHint(retryable: boolean, canRetry: boolean): string {
  if (canRetry) {
    return "The wait gives the server a moment to recover before trying again.";
  }

  return retryable
    ? "Go back and open the export link again to retry."
    : "Nothing on this page needs your attention - you can close the tab.";
}

interface ExportErrorPageProps {
  searchParams: Promise<{ code?: string }>;
}

/**
 * Terminal page for a failed public export. Reached by redirect from the
 * export route, which passes a code - never a message. See
 * `features/pdf-export/export-error-content.ts`.
 */
export default async function ExportErrorPage({
  searchParams,
}: ExportErrorPageProps) {
  const { code } = await searchParams;
  const content = getExportErrorContent(code);
  const Icon = ICONS[content.key];

  // Read only to decide whether a retry is possible. The stored link is never
  // rendered - the retry POSTs and the handler resolves it server-side - so the
  // access token stays out of the page entirely.
  const storedRetry = content.offersRetry
    ? (await cookies()).get(EXPORT_RETRY_COOKIE)?.value
    : undefined;
  const canRetry = parseExportRetryTarget(storedRetry) !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-xl border-primary/20 shadow-lg">
        <CardHeader className="flex flex-col items-center gap-4 pb-4 text-center">
          <Badge variant="secondary">{content.eyebrow}</Badge>
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-10" aria-hidden />
          </div>
          <CardTitle className="text-3xl tracking-tight md:text-4xl">
            {content.title}
          </CardTitle>
          <CardDescription className="max-w-prose text-base">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 text-center">
          {canRetry && <RetryExportButton />}

          <Separator />

          <p className="max-w-prose text-sm text-muted-foreground">
            {retryHint(content.retryable, canRetry)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

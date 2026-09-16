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
import {
  EXPORT_ERROR_CODE,
  getExportErrorContent,
  type ExportErrorCode,
} from "@/features/pdf-export/export-error-content";
import { SupportReferenceLine } from "@/features/pdf-export/export-error/support-reference-line";
import { parseSupportReference } from "@/features/pdf-export/support-reference";

const ICONS: Readonly<Record<ExportErrorCode, LucideIcon>> = {
  [EXPORT_ERROR_CODE.TIMEOUT]: Clock,
  [EXPORT_ERROR_CODE.UPSTREAM]: ServerCrash,
  [EXPORT_ERROR_CODE.EXPIRED]: Hourglass,
  [EXPORT_ERROR_CODE.FORBIDDEN]: ShieldAlert,
  [EXPORT_ERROR_CODE.NOT_FOUND]: FileQuestion,
  [EXPORT_ERROR_CODE.INVALID]: TriangleAlert,
  [EXPORT_ERROR_CODE.UNKNOWN]: TriangleAlert,
};

interface ExportErrorPageProps {
  searchParams: Promise<{ code?: string; ref?: string }>;
}

/**
 * Terminal page for a failed public export. Reached by redirect from the
 * export route, which passes a code - never a message. See
 * `features/pdf-export/export-error-content.ts`.
 */
export default async function ExportErrorPage({
  searchParams,
}: ExportErrorPageProps) {
  const { code, ref } = await searchParams;
  const content = getExportErrorContent(code);
  const Icon = ICONS[content.key];

  // Arrives in the URL, so clamp its shape before putting it on the page.
  const reference = parseSupportReference(ref);

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
          <Separator />

          <p className="max-w-prose text-sm text-muted-foreground">
            {content.hint}
          </p>

          {reference && <SupportReferenceLine reference={reference} />}
        </CardContent>
      </Card>
    </div>
  );
}

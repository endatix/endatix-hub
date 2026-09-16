import { getExportErrorContent } from "@/features/pdf-export/export-error-content";
import { ExportErrorCard } from "@/features/pdf-export/export-error/export-error-card";
import { parseSupportReference } from "@/features/pdf-export/support-reference";

interface ExportErrorPageProps {
  searchParams: Promise<{ code?: string; ref?: string }>;
}

/** Public export failures. Query carries a code, never a message. */
export default async function ExportErrorPage({
  searchParams,
}: Readonly<ExportErrorPageProps>) {
  const { code, ref } = await searchParams;

  return (
    <ExportErrorCard
      content={getExportErrorContent(code)}
      reference={parseSupportReference(ref)}
    />
  );
}

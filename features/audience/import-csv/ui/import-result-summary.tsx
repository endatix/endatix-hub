import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AudienceImportResult } from "@/lib/endatix-api/audience/types";

function counts(result: AudienceImportResult): string {
  return `${result.createdCount} added, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.rejectedCount} rejected.`;
}

export function ImportResultSummary({
  result,
}: Readonly<{ result: AudienceImportResult }>) {
  const clean = result.rejectedCount === 0;
  return (
    <Alert variant={clean ? "success" : "warning"}>
      <AlertTitle>{clean ? "Import finished" : "Import finished with rejected rows"}</AlertTitle>
      <AlertDescription>
        <p>{counts(result)}</p>
        {result.rejections.map((rejection) => (
          <p key={rejection.rowNumber}>
            Row {rejection.rowNumber}: {rejection.reason}
          </p>
        ))}
      </AlertDescription>
    </Alert>
  );
}

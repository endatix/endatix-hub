"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLocaleLabel } from "../translations/locale-discovery";
import type { LocaleImportDiscovery } from "../translations/locale-discovery";

interface DataListCsvPreviewProps {
  discovery: LocaleImportDiscovery;
  name?: string;
  description?: string;
}

/**
 * Lightweight CSV import preview from locale discovery (API remains authoritative).
 */
export function DataListCsvPreview({
  discovery,
  name,
  description,
}: Readonly<DataListCsvPreviewProps>) {
  const localeKeys: string[] = [];
  const seen = new Set<string>();
  for (const column of discovery.columns) {
    if (!column.key || column.kind === "invalid" || seen.has(column.key)) {
      continue;
    }
    seen.add(column.key);
    localeKeys.push(column.key);
  }

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">CSV Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Rows</div>
            <div className="font-semibold">{discovery.rowCount}</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Locale columns</div>
            <div className="font-semibold">{localeKeys.length}</div>
          </div>
        </div>

        {(name || description) && (
          <div className="rounded-md border p-3 text-xs">
            {name ? <p className="font-medium">{name}</p> : null}
            {description ? (
              <p className="text-muted-foreground">{description}</p>
            ) : null}
          </div>
        )}

        {localeKeys.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            Columns:{" "}
            {localeKeys
              .map((key) =>
                key === "default" ? "default" : formatLocaleLabel(key),
              )
              .join(", ")}
          </div>
        ) : null}

        {discovery.structuralErrors.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-destructive">
            {discovery.structuralErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        {discovery.invalidLocales.length > 0 ? (
          <p className="text-destructive">
            Invalid locales: {discovery.invalidLocales.join(", ")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

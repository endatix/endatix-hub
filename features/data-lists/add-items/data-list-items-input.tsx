"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DataListExportFormat } from "@/lib/endatix-api/data-lists/types";
import { Download, FileBraces, FileSpreadsheet, FileUp } from "lucide-react";

export type DataListSourceFormat = DataListExportFormat;

export const JSON_TEMPLATE_HREF = "/templates/data-list-template.json";
export const CSV_TEMPLATE_HREF = "/templates/data-list-template.csv";

const isDataListSourceFormat = (value: string): value is DataListSourceFormat =>
  value === "csv" || value === "json";

interface DataListItemsInputProps {
  format: DataListSourceFormat;
  onFormatChange: (format: DataListSourceFormat) => void;
  onFileSelected: (file: File | null) => void;
  selectedFileName?: string | null;
  fileInputId: string;
}

/**
 * CSV/JSON file upload control for Create and Replace data-list flows.
 */
export function DataListItemsInput({
  format,
  onFormatChange,
  onFileSelected,
  selectedFileName,
  fileInputId,
}: Readonly<DataListItemsInputProps>) {
  const isCsv = format === "csv";
  const templateHref = isCsv ? CSV_TEMPLATE_HREF : JSON_TEMPLATE_HREF;
  const accept = isCsv ? ".csv,text/csv" : "application/json,.json";
  const formatLabel = isCsv ? "CSV" : "JSON";

  return (
    <div className="space-y-4">
      <Tabs
        value={format}
        onValueChange={(value) => {
          if (isDataListSourceFormat(value)) {
            onFormatChange(value);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv">
            <FileSpreadsheet data-icon="inline-start" />
            CSV
          </TabsTrigger>
          <TabsTrigger value="json">
            <FileBraces data-icon="inline-start" />
            JSON
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <label
        htmlFor={fileInputId}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition hover:bg-muted/40"
      >
        <FileUp className="mb-2 h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Browse {formatLabel} file</span>
        <span className="text-xs text-muted-foreground">
          Max file size: 5MB
        </span>
      </label>

      <input
        id={fileInputId}
        key={format}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) =>
          onFileSelected(event.target.files?.item(0) ?? null)
        }
      />

      {selectedFileName ? (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedFileName}
        </p>
      ) : null}

      <a
        href={templateHref}
        download
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Download className="h-4 w-4" />
        Download {formatLabel} template
      </a>
    </div>
  );
}

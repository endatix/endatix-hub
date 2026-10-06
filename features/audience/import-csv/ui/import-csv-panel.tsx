"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelForm } from "@/components/common/panel-form";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { importableProperties } from "../column-map";
import { useImportCsv } from "../use-import-csv.hook";
import { ColumnMapFields } from "./column-map-fields";
import { ImportResultSummary } from "./import-result-summary";

type ImportCsvPanelProps = {
  formId: string;
  properties: AudienceProperty[];
};

const TRIGGER = (
  <Button variant="outline">
    <Upload />
    Import CSV
  </Button>
);

export function ImportCsvPanel(props: Readonly<ImportCsvPanelProps>) {
  const form = useImportCsv(props.formId, props.properties);
  const mapped = importableProperties(props.properties);
  const finished = form.step === "result" && form.result;
  return (
    <PanelForm
      open={form.open}
      onOpenChange={form.openChange}
      desktopType="complex"
      trigger={TRIGGER}
      pending={form.pending}
      title="Import people"
      description="Upload a CSV, map its columns, then confirm. Closing before import writes nothing."
      error={form.error}
      errorTitle="Import not started"
      submitLabel={finished ? "Close" : "Import"}
      pendingLabel="Importing…"
      submitDisabled={form.step !== "map" && !finished}
      onSubmit={finished ? () => form.openChange(false) : form.submit}
    >
      {form.step === "file" ? (
        <Input
          type="file"
          accept=".csv,text/csv"
          disabled={form.pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) form.loadFile(file);
          }}
        />
      ) : null}
      {form.step === "map" ? (
        <>
          <p className="text-sm text-muted-foreground">
            {form.rowCount} data rows. Choice properties are not imported here.
          </p>
          <ColumnMapFields
            headers={form.headers}
            properties={mapped}
            identifierColumn={form.identifierColumn}
            columns={form.columns}
            disabled={form.pending}
            onIdentifier={form.setIdentifierColumn}
            onProperty={form.setPropertyColumn}
          />
        </>
      ) : null}
      {form.result ? <ImportResultSummary result={form.result} /> : null}
    </PanelForm>
  );
}

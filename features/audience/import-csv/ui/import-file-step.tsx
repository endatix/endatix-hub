"use client";

import { FileUp } from "lucide-react";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import { MAX_IMPORT_ROWS } from "../csv-preview";
import type { ImportWizard } from "../use-import-csv.hook";
import { rowCountLabel } from "../import-labels";

const FIELD_ID = "import-file";
const LIMITS = `Up to ${MAX_IMPORT_ROWS.toLocaleString()} rows. The first row names the columns.`;

/** What the help line says: the limits before a file, what was read after, or why it can't be. */
function fileHelp({ file, problem }: ImportWizard): string {
  if (problem) return problem;
  if (!file) return LIMITS;
  const { rowCount, headers } = file.preview;
  return `${file.name}: ${rowCountLabel(rowCount)}, ${headers.length} columns.`;
}

function FileInput({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  return (
    <Input
      id={FIELD_ID}
      type="file"
      accept=".csv,text/csv"
      aria-describedby={helpId(FIELD_ID)}
      aria-invalid={wizard.problem !== null}
      onChange={(event) => {
        const picked = event.target.files?.[0];
        if (picked) void wizard.pick(picked);
      }}
    />
  );
}

/** Step 1: choose the file. Reading it writes nothing; Continue opens the column choices. */
export function ImportFileStep({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  return (
    <PanelSection
      icon={FileUp}
      title="File"
      description="A CSV with one person per row, such as an export from a spreadsheet or a panel tool."
    >
      <FieldWithHelp
        id={FIELD_ID}
        label="CSV file"
        help={fileHelp(wizard)}
        invalid={wizard.problem !== null}
      >
        <FileInput wizard={wizard} />
      </FieldWithHelp>
    </PanelSection>
  );
}

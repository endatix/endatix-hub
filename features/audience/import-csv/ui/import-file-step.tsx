"use client";

import { FileUp } from "lucide-react";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import type { AudienceImportLimits } from "@/lib/endatix-api/audience/types";
import type { ImportWizard } from "../use-import-csv.hook";
import { limitsLabel, rowCountLabel } from "../import-labels";

const FIELD_ID = "import-file";

type FileStepProps = { wizard: ImportWizard; limits: AudienceImportLimits };

/** What the help line says: this host's limits before a file, what was read after, or why it can't be. */
function fileHelp({ wizard: { file, problem }, limits }: FileStepProps): string {
  if (problem) return problem;
  if (!file) return `${limitsLabel(limits)} The first row names the columns.`;
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
export function ImportFileStep(props: Readonly<FileStepProps>) {
  const { wizard } = props;
  return (
    <PanelSection
      icon={FileUp}
      title="File"
      description="A CSV with one participant per row, such as an export from a spreadsheet or a panel tool."
    >
      <FieldWithHelp
        id={FIELD_ID}
        label="CSV file"
        help={fileHelp(props)}
        invalid={wizard.problem !== null}
      >
        <FileInput wizard={wizard} />
      </FieldWithHelp>
    </PanelSection>
  );
}

"use client";

import { ClipboardCheck, Info } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { identifierKindLabel } from "../../utils";
import { mappableColumns, SKIP_COLUMN } from "../column-map";
import type {
  ImportCsvSetup,
  ImportWizard,
  LoadedFile,
} from "../use-import-csv.hook";

type ReviewProps = {
  wizard: ImportWizard;
  setup: ImportCsvSetup;
  file: LoadedFile;
};

const Literal = ({ value }: Readonly<{ value: string }>) => (
  <span className="font-mono">{value}</span>
);

/** Each property the file fills, labelled by the property, valued by its column. */
/** Columns the import leaves out, so a forgotten one shows before anything is written. */
function SkippedRow({ wizard, file, setup }: Readonly<ReviewProps>) {
  const { identifierColumn, columns } = wizard.choices;
  const headers = file.preview.headers;
  const skipped = mappableColumns(
    headers,
    identifierColumn,
    setup.properties,
  ).filter((column) => (columns[column] ?? SKIP_COLUMN) === SKIP_COLUMN);
  if (skipped.length === 0) return null;
  return (
    <SummaryRow
      label="Not imported"
      value={<Literal value={skipped.join(", ")} />}
    />
  );
}

function MappedRows({ wizard, setup }: Readonly<ReviewProps>) {
  const byVariable = new Map(
    setup.properties.map((property) => [property.variableName, property]),
  );
  return Object.entries(wizard.choices.columns)
    .filter(([, variableName]) => variableName !== SKIP_COLUMN)
    .map(([column, variableName]) => (
      <SummaryRow
        key={column}
        label={byVariable.get(variableName)?.name ?? variableName}
        value={<Literal value={column} />}
      />
    ));
}

/** The consequence, once: how a row meets the people already here (DESIGN.md §6). */
function MatchingNote({ setup }: Readonly<Pick<ReviewProps, "setup">>) {
  const matchedBy = identifierKindLabel(setup.identifierKind).toLowerCase();
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>Existing people are updated</AlertTitle>
      <AlertDescription>
        Rows are matched by {matchedBy}. A person already here gets the
        file&apos;s values, and an empty cell keeps the value they have. A row
        that fails a check is rejected, and the other rows still import.
      </AlertDescription>
    </Alert>
  );
}

/** Step 3: what the import will do, built from the choices; Import is the first write. */
export function ImportReviewStep(props: Readonly<ReviewProps>) {
  return (
    <>
      <PanelSection
        icon={ClipboardCheck}
        title="Review"
        description="This is what the import reads. Nothing is written until you import."
      >
        <ReviewRows {...props} />
      </PanelSection>
      <MatchingNote setup={props.setup} />
    </>
  );
}

function ReviewRows(props: Readonly<ReviewProps>) {
  const { file, wizard } = props;
  return (
    <dl className="grid gap-3">
      <SummaryRow label="File" value={file.name} />
      <SummaryRow label="Rows" value={file.preview.rowCount.toLocaleString()} />
      <SummaryRow
        label="Identifier column"
        value={<Literal value={wizard.choices.identifierColumn} />}
      />
      <MappedRows {...props} />
      <SkippedRow {...props} />
    </dl>
  );
}

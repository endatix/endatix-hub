"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, LayoutTemplate } from "lucide-react";
import {
  SUBMISSION_GRID_METADATA_COLUMN_IDS,
  type SubmissionGridMetadataColumnId,
} from "../submission-grid-columns";
import {
  useSubmissionGridView,
  type SubmissionGridView,
} from "./submission-grid-view-context";

const METADATA_COLUMN_LABELS: Record<SubmissionGridMetadataColumnId, string> = {
  complete: "Status",
  modifiedAt: "Last modified",
  startedAt: "Started",
  completedAt: "Completed",
  createdAt: "Created",
  submitterDisplayId: "Submitter",
  completionTime: "Time",
  status: "Review",
};

/** Shows or hides the grid's own columns; form editors also save the view. */
export function SubmissionGridViewMenu({
  disabled,
}: Readonly<{ disabled: boolean }>) {
  const view = useSubmissionGridView();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {view.isSaving ? <Spinner className="h-4 w-4" /> : <LayoutTemplate />}
          <span className="sr-only sm:not-sr-only">View</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <MetadataColumnItems view={view} />
        {view.canSave && <SaveViewItem view={view} />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ViewProps = Readonly<{ view: SubmissionGridView }>;

function SaveViewItem({ view }: ViewProps) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={view.isSaving} onSelect={view.save}>
        Save view for everyone
      </DropdownMenuItem>
    </>
  );
}

/** Toggles stay open, so several columns can be shown or hidden at once. */
function MetadataColumnItems({ view }: ViewProps) {
  const hidden = new Set(view.hiddenMetadata);
  return (
    <>
      <DropdownMenuLabel>Details</DropdownMenuLabel>
      {SUBMISSION_GRID_METADATA_COLUMN_IDS.map((id) => (
        <DropdownMenuCheckboxItem
          key={id}
          checked={!hidden.has(id)}
          onCheckedChange={(checked) => view.setMetadataVisible(id, checked)}
          onSelect={(event) => event.preventDefault()}
        >
          {METADATA_COLUMN_LABELS[id]}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

/** Why the last Save view did not go through, e.g. someone saved first. */
export function SubmissionGridViewError() {
  const { saveError } = useSubmissionGridView();
  if (!saveError) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-4" role="alert">
      <AlertTriangle />
      <AlertDescription>{saveError}</AlertDescription>
    </Alert>
  );
}

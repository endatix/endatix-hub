import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { Submission } from "@/lib/endatix-api";
import { getElapsedTimeString, getFormattedDate } from "@/lib/utils";
import { PropertyDisplay } from "../details/property-display";

interface EditSubmissionHeaderProps {
  submission: Submission;
  onSaveClick: () => void;
  onDiscardClick: () => void;
  hasChanges: boolean;
  isSaving: boolean;
  isPublicMode?: boolean;
  minutesRemaining?: number | null;
}

function EditSubmissionHeader({
  submission,
  onSaveClick,
  onDiscardClick,
  hasChanges,
  isSaving,
  isPublicMode = false,
  minutesRemaining,
}: EditSubmissionHeaderProps) {
  const formDefinition = JSON.parse(
    submission.formDefinition?.jsonData ?? "{}",
  );

  return (
    <>
      <div className="sticky top-0 py-4 z-50 w-full bg-background/10 backdrop-blur supports-[backdrop-filter]:bg-background/30 hover:bg-background/95 transition-colors duration-200">
        <div className="flex flex-col gap-4 w-full md:w-1/2 mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{formDefinition.title}</h1>
            {isPublicMode && (
              <p className="text-lg font-semibold text-muted-foreground mt-2">
                Editing submission
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {minutesRemaining != null && minutesRemaining <= 10 && minutesRemaining > 0 && (
              <div className="text-lg text-right">
                <span className={`font-bold ${minutesRemaining <= 5 ? "text-red-500" : "text-yellow-600"}`}>
                  ⏱️ Access expires in {minutesRemaining} {minutesRemaining === 1 ? "minute" : "minutes"}
                </span>
              </div>
            )}
            <div className="flex flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={onDiscardClick}
                disabled={isSaving}
              >
                Discard
              </Button>
              <Button
                variant="default"
                onClick={onSaveClick}
                disabled={!hasChanges || isSaving}
              >
                {isSaving && <Spinner className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isPublicMode && (
        <div className="py-4 w-full bg-background">
          <div className="w-full md:w-1/2 mx-auto">
            <div className="text-sm">
              <PropertyDisplay label="ID">
                {submission.id}
              </PropertyDisplay>
              <PropertyDisplay label="Created at">
                {getFormattedDate(submission.createdAt)}
              </PropertyDisplay>
              <PropertyDisplay label="Is Complete?">
                {submission.isComplete ? "Yes" : "No"}
              </PropertyDisplay>
              {submission.isComplete && (
                <>
                  <PropertyDisplay label="Completed at">
                    {getFormattedDate(submission.completedAt)}
                  </PropertyDisplay>
                  <PropertyDisplay label="Completion time">
                    {getElapsedTimeString(submission.createdAt, submission.completedAt, "long")}
                  </PropertyDisplay>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EditSubmissionHeader;

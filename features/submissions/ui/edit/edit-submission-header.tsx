import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { Submission } from "@/lib/endatix-api";
import { LocalizationWrapper } from "@/lib/survey-features/infrastructure/localization-wrapper";
import {
  getElapsedTimeString,
  getFormattedDate,
  getSubmissionStartedAt,
} from "@/lib/utils";
import { tryParseJson } from "@/lib/utils/type-parsers";
import { Result } from "@/lib/result";

interface EditSubmissionHeaderProps {
  submission: Submission;
  onSaveClick: () => void;
  onDiscardClick: () => void;
  hasChanges: boolean;
  isSaving: boolean;
  isPublicMode?: boolean;
  minutesRemaining?: number | null;
}

const DEFAULT_TITLE = "Untitled Form";
type SurveySchema = Record<string, unknown> | undefined;
type SubmissionMetadataItem = {
  label: string;
  value: string;
};

function EditSubmissionHeader({
  submission,
  onSaveClick,
  onDiscardClick,
  hasChanges,
  isSaving,
  isPublicMode = false,
  minutesRemaining,
}: EditSubmissionHeaderProps) {
  const formDefinitionResult = tryParseJson<SurveySchema>(
    submission.formDefinition?.jsonData,
  );

  let title: unknown = DEFAULT_TITLE;

  if (Result.isSuccess(formDefinitionResult)) {
    const formDefinition = formDefinitionResult.value;
    title = formDefinition?.title ?? DEFAULT_TITLE;
  }

  const locTitle = new LocalizationWrapper(title);
  const metadataItems: SubmissionMetadataItem[] = [
    {
      label: "ID",
      value: submission.id,
    },
    {
      label: "Is Complete",
      value: submission.isComplete ? "Yes" : "No",
    },
    {
      label: "Created at",
      value: getFormattedDate(submission.createdAt),
    },
    {
      label: "Last modified",
      value: getFormattedDate(submission.modifiedAt),
    },
    {
      label: "Started at",
      value: getFormattedDate(submission.startedAt, "—"),
    },
    {
      label: "Completed at",
      value: submission.isComplete
        ? getFormattedDate(submission.completedAt)
        : "—",
    },
    {
      label: "Completion time",
      value: submission.isComplete
        ? getElapsedTimeString(
            getSubmissionStartedAt(submission),
            submission.completedAt,
            "long",
          )
        : "—",
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-background/10 py-4 backdrop-blur transition-colors duration-200 hover:bg-background/95 supports-[backdrop-filter]:bg-background/30">
        <div
          className={`mx-auto flex w-full flex-col gap-4 ${isPublicMode ? "" : "md:w-1/2"}`}
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold">{locTitle.text}</h1>
            {isPublicMode && (
              <p className="mt-2 text-lg font-semibold text-muted-foreground">
                Editing submission
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {minutesRemaining != null &&
              minutesRemaining <= 10 &&
              minutesRemaining > 0 && (
                <div className="text-right text-lg">
                  <span
                    className={`font-bold ${minutesRemaining <= 5 ? "text-red-500" : "text-yellow-600"}`}
                  >
                    ⏱️ Access expires in {minutesRemaining}{" "}
                    {minutesRemaining === 1 ? "minute" : "minutes"}
                  </span>
                </div>
              )}
            <div className="flex flex-row justify-end gap-2">
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
        <section className="overflow-hidden rounded-lg border border-border/25 bg-surface-container-lowest shadow-sm">
          <dl className="grid gap-px bg-border/20 sm:grid-cols-2 lg:grid-cols-4">
            {metadataItems.map((item) => (
              <div
                key={item.label}
                className="min-w-0 bg-surface-container-lowest p-4"
              >
                <dt className="text-[10px] leading-none font-bold tracking-widest text-muted-foreground uppercase">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm font-medium break-words text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}

export default EditSubmissionHeader;

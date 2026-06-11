import { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { LocalizationWrapper } from "@/lib/survey-features/infrastructure/localization-wrapper";
import { getElapsedTimeString, getFormattedDate } from "@/lib/utils";
import { tryParseJson } from "@/lib/utils/type-parsers";

interface ViewSubmissionHeaderProps {
  submission: Submission;
}

type SubmissionMetadataItem = {
  label: string;
  value: string;
};
type SurveySchema = Record<string, unknown> | undefined;

const DEFAULT_TITLE = "Untitled Form";

function ViewSubmissionHeader({ submission }: ViewSubmissionHeaderProps) {
  const formDefinitionResult = tryParseJson<SurveySchema>(
    submission.formDefinition?.jsonData,
  );
  const formDefinition = Result.isSuccess(formDefinitionResult)
    ? formDefinitionResult.value
    : undefined;

  const locTitle = new LocalizationWrapper(
    formDefinition?.title ?? DEFAULT_TITLE,
  );
  const metadataItems: SubmissionMetadataItem[] = [
    {
      label: "ID",
      value: submission.id,
    },
    {
      label: "Created at",
      value: getFormattedDate(submission.createdAt),
    },
    {
      label: "Is Complete",
      value: submission.isComplete ? "Yes" : "No",
    },
  ];

  if (submission.isComplete) {
    metadataItems.push(
      {
        label: "Completed at",
        value: getFormattedDate(submission.completedAt),
      },
      {
        label: "Completion time",
        value: getElapsedTimeString(
          submission.createdAt,
          submission.completedAt,
          "long",
        ),
      },
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border/25 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-border/40 px-4 py-5 text-center sm:px-6">
        <p className="text-sm font-medium text-muted-foreground">
          Viewing submission
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {locTitle.text}
        </h1>
      </div>

      <dl className="grid gap-px bg-border/20 sm:grid-cols-2 lg:grid-cols-5">
        {metadataItems.map((item) => (
          <div
            key={item.label}
            className="min-w-0 bg-surface-container-lowest p-4"
          >
            <dt className="text-[10px] leading-none font-bold tracking-widest text-muted-foreground uppercase">
              {item.label}
            </dt>
            <dd className="mt-2 break-words text-sm font-medium text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default ViewSubmissionHeader;

import { Submission } from "@/lib/endatix-api";
import { getElapsedTimeString, getFormattedDate } from "@/lib/utils";
import { PropertyDisplay } from "../details/property-display";

interface ViewSubmissionHeaderProps {
  submission: Submission;
}

function ViewSubmissionHeader({ submission }: ViewSubmissionHeaderProps) {
  const formDefinition = JSON.parse(
    submission.formDefinition?.jsonData ?? "{}",
  );

  return (
    <>
      <div className="sticky top-0 py-4 z-50 w-full bg-background/10 backdrop-blur supports-[backdrop-filter]:bg-background/30 hover:bg-background/95 transition-colors duration-200">
        <div className="w-full md:w-1/2 mx-auto text-center">
          <h1 className="text-2xl font-bold">{formDefinition.title}</h1>
          <p className="text-lg font-semibold text-muted-foreground mt-2">
            Viewing submission
          </p>
        </div>
      </div>

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
    </>
  );
}

export default ViewSubmissionHeader;

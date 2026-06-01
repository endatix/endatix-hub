import { Skeleton } from "@/components/ui/skeleton";
import type { PublicSurveyVariant } from "@/features/public-form/types";

export type PublicSurveySkeletonProps = {
  variant: PublicSurveyVariant;
};

export function PublicSurveySkeleton({ variant }: PublicSurveySkeletonProps) {
  const questions = Array.from({ length: 8 }, (_, index) => index + 1);
  const containerClassName =
    variant === "embed" ? "w-full p-4" : "w-full overflow-auto p-4";

  return (
    <div className={containerClassName}>
      <div className="mx-auto flex max-w-4xl flex-col items-center space-y-4">
        <Skeleton className="h-12 w-full" />
        {questions.map((question) => (
          <Skeleton className="h-16 w-full" key={question} />
        ))}
      </div>
    </div>
  );
}

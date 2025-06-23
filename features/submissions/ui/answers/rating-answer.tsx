import { cn } from "@/lib/utils";
import { Minus, Star } from "lucide-react";
import React from "react";
import { Question } from "survey-core";

interface RatingAnswerProps extends React.HTMLAttributes<HTMLDivElement> {
  question: Question;
}

const RatingAnswer: React.FC<RatingAnswerProps> = ({ question, ...props }) => {
  const minRating = question.rateMin;
  const maxRating = question.rateMax;
  const ratingStep = question.rateStep;
  const ratingValue = question?.value ?? 0;
  const ratingText = `${ratingValue} out of ${maxRating}`;
  const ratingScale = Array.from(
    { length: (maxRating - minRating) / ratingStep + 1 },
    (_, i) => minRating + i * ratingStep,
  );

  if (question.value === undefined) {
    return <Minus className="h-4 w-4" />;
  }

  return (
    <div
      {...props}
      className={cn("flex flex-col items-start gap-2", props.className)}
    >
      <div className="flex justify-start gap-1">
        {ratingScale.map((scale, index) => (
          <React.Fragment key={index}>
            {scale <= ratingValue ? (
              <Star className="h-4 w-4 text-primary fill-primary cursor-not-allowed opacity-70" />
            ) : (
              <Star className="h-4 w-4 text-primary cursor-not-allowed opacity-70" />
            )}
          </React.Fragment>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{ratingText}</p>
    </div>
  );
};

export default RatingAnswer;

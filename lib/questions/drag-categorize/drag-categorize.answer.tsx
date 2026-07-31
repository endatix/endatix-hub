import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import React from "react";
import type { Question } from "survey-core";
import { resolveAnswerZones } from "./utils";

interface DragCategorizeAnswerProps
  extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

/**
 * Read-only submission view: each zone with the items the respondent
 * dropped into it. Unplaced items are omitted — they carry no answer.
 *
 * Zone and item resolution is shared with the PDF viewer so the two cannot
 * disagree about what an answer looks like.
 */
export const DragCategorizeAnswer = ({
  question,
  className,
  ...props
}: DragCategorizeAnswerProps) => {
  const zones = resolveAnswerZones(question);

  if (zones.length === 0) {
    return <Minus className="h-4 w-4" />;
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)} {...props}>
      {zones.map((zone) => (
        <div key={zone.value} className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            {zone.title}
          </p>
          {zone.items.length === 0 ? (
            <Minus className="h-4 w-4" />
          ) : (
            <div className="flex flex-row flex-wrap gap-2">
              {zone.items.map((item) => (
                <Badge
                  key={item.value}
                  variant="outline"
                  className="flex flex-row items-center gap-2 text-sm font-medium"
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.text}
                      className="h-6 w-6 object-contain"
                    />
                  )}
                  {item.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DragCategorizeAnswer;

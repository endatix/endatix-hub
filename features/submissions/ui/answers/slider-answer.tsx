"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import type { HTMLAttributes } from "react";
import { QuestionSliderModel } from "survey-core";

interface SliderAnswerProps extends HTMLAttributes<HTMLDivElement> {
  question: QuestionSliderModel;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function getSliderThumbValues(question: QuestionSliderModel): number[] | null {
  const { min, max, sliderType, value: raw } = question;

  if (sliderType === "range") {
    if (!Array.isArray(raw) || raw.length < 2) {
      return null;
    }
    const a = clamp(Number(raw[0]), min, max);
    const b = clamp(Number(raw[1]), min, max);
    return a <= b ? [a, b] : [b, a];
  }

  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const n = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
  if (Number.isNaN(n)) {
    return null;
  }

  return [clamp(n, min, max)];
}

const SliderAnswer = ({ question, className, ...props }: SliderAnswerProps) => {
  const min = question.min;
  const max = question.max;
  const step = question.step ?? 1;
  const thumbs = getSliderThumbValues(question);

  if (thumbs === null) {
    return (
      <div
        {...props}
        className={cn(
          "flex items-center gap-2 text-muted-foreground",
          className,
        )}
      >
        <Minus className="h-4 w-4 shrink-0" />
        <span className="text-sm">No answer</span>
      </div>
    );
  }

  return (
    <div
      {...props}
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
    >
      <Slider
        value={thumbs}
        min={min}
        max={max}
        step={step}
        disabled
        className="w-full"
      />
      <p className="text-xs text-muted-foreground tabular-nums">
        {question.sliderType === "range"
          ? `${thumbs[0]} – ${thumbs[1]} (scale ${min}–${max})`
          : `${thumbs[0]} (scale ${min}–${max})`}
      </p>
    </div>
  );
};

export default SliderAnswer;

import { cn } from "@/lib/utils";
import { QuestionSignaturePadModel } from "survey-core";
import { Signature } from "lucide-react";
import Image from "next/image";

interface FileAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: QuestionSignaturePadModel;
}

const getSignatureContainerStyle = (
  question: QuestionSignaturePadModel,
): React.CSSProperties | undefined => {
  if (question.backgroundImage) {
    return {
      backgroundImage: `url(${question.backgroundImage})`,
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
    };
  }

  if (question.backgroundColor) {
    return {
      backgroundColor: question.backgroundColor,
    };
  }

  return undefined;
};

export function SignaturePadAnswer({
  question,
  className,
  ...props
}: FileAnswerProps) {
  if (!question.value) {
    return (
      <div className={cn("col-span-3", className)} {...props}>
        <div className="flex items-center justify-start text-sm text-muted-foreground space-x-4 pb-1">
          <Signature className="w-4 h-4 mr-2" />
          No signature provided
        </div>
      </div>
    );
  }

  const imageWidth = 350;
  const imageHeight = 450;

  return (
    <div className={cn("col-span-3", className)} {...props}>
      <div
        className="relative"
        style={{ width: imageWidth, height: "auto", maxHeight: imageHeight }}
      >
        <div
          className="absolute inset-0"
          style={getSignatureContainerStyle(question)}
        />
        <Image
          src={question.value}
          alt={question.name || ""}
          width={imageWidth}
          height={imageHeight}
          className="relative z-10 h-full w-full object-contain transition-all"
        />
      </div>
    </div>
  );
}

import { useAssetStorage } from "@/features/asset-storage/client";
import { cn } from "@/lib/utils";
import { Signature } from "lucide-react";
import Image from "next/image";
import { QuestionSignaturePadModel } from "survey-core";

interface FileAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: QuestionSignaturePadModel;
}

const getSignatureContainerStyle = (
  backgroundImageUrl?: string,
  backgroundColor?: string,
): React.CSSProperties | undefined => {
  if (backgroundImageUrl) {
    return {
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
    };
  }

  if (backgroundColor) {
    return {
      backgroundColor: backgroundColor,
    };
  }

  return undefined;
};

export function SignaturePadAnswer({
  question,
  className,
  ...props
}: FileAnswerProps) {
  const { resolveStorageUrl } = useAssetStorage();

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
  const signatureImageUrl = resolveStorageUrl(question.value);
  const backgroundImageUrl = resolveStorageUrl(question.backgroundImage);

  return (
    <div className={cn("col-span-3", className)} {...props}>
      <div
        className="relative"
        style={{ width: imageWidth, height: "auto", maxHeight: imageHeight }}
      >
        <div
          className="absolute inset-0"
          style={getSignatureContainerStyle(backgroundImageUrl, question.backgroundColor)}
        />
        <Image
          src={signatureImageUrl}
          alt={question.name || ""}
          width={imageWidth}
          height={imageHeight}
          className="relative z-10 h-full w-full object-contain transition-all"
        />
      </div>
    </div>
  );
}

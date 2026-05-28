import { LazyStorageMedia } from "@/features/asset-storage/ui/lazy-storage-media";
import { usePrivateStorageDisplayUrl } from "@/features/asset-storage/client";
import { cn } from "@/lib/utils";
import { Signature } from "lucide-react";
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

function SignaturePadAnswerContent({
  question,
  className,
  ...props
}: Readonly<FileAnswerProps>) {
  const { displayUrl: signatureImageUrl } = usePrivateStorageDisplayUrl(
    question.value,
  );
  const { displayUrl: backgroundImageUrl } = usePrivateStorageDisplayUrl(
    question.backgroundImage,
  );

  if (!question.value) {
    return (
      <div className={cn("col-span-3", className)} {...props}>
        <div className="flex h-auto items-center justify-start space-x-4 pb-1 text-sm text-muted-foreground">
          <Signature className="mr-2 h-4 w-4" />
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
          style={getSignatureContainerStyle(
            backgroundImageUrl,
            question.backgroundColor,
          )}
        />
        <img
          src={signatureImageUrl}
          alt={question.name || ""}
          width={imageWidth}
          height={imageHeight}
          loading="lazy"
          className="relative z-10 h-full w-full object-contain transition-all"
        />
      </div>
    </div>
  );
}

export function SignaturePadAnswer(props: Readonly<FileAnswerProps>) {
  if (!props.question.value) {
    return <SignaturePadAnswerContent {...props} />;
  }

  return (
    <LazyStorageMedia
      className={cn("col-span-3", props.className)}
      placeholderClassName="min-h-[450px] w-[350px]"
    >
      <SignaturePadAnswerContent {...props} className={undefined} />
    </LazyStorageMedia>
  );
}

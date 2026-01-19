import { useAssetStorage } from '@/features/asset-storage/client';
import { enhanceUrlWithToken, resolveContainerFromUrl } from '@/features/asset-storage/utils';
import { FileType, getFileType, IFile } from "@/lib/questions/file/file-type";
import { Result } from '@/lib/result';
import { cn } from "@/lib/utils";
import { FileText, FileX2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use } from 'react';

interface FileViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  file: IFile;
  width?: number;
  height?: number;
  aspectRatio?: "portrait" | "square";
}

const defaultReadTokenPromise = Promise.resolve(Result.success({
  token: null,
  containerName: "",
  expiresOn: new Date(),
  generatedAt: new Date(),
}));

export function FileViewer({
  file,
  width,
  height,
  className,
  aspectRatio = "portrait",
  ...props
}: FileViewerProps) {
  const { tokens, config: storageConfig } = useAssetStorage();
  const contentToken = use(tokens?.content ?? defaultReadTokenPromise);
  const userFilesToken = use(tokens?.userFiles ?? defaultReadTokenPromise);

  const containerInfo = resolveContainerFromUrl(file.content, storageConfig);
  const fileType = getFileType(file);

  const enhancedFileContent = (() => {
    const tokenResult = (containerInfo?.containerType === "USER_FILES") ? userFilesToken : contentToken;
    if (!Result.isSuccess(tokenResult)) {
      return file.content;
    }
    return enhanceUrlWithToken(file.content, tokenResult.value.token);
  })();


  return (
    <div className={cn("space-y-3", className)} {...props}>
      <div className="overflow-hidden rounded-md">
        {fileType === FileType.Image && (
          <Image
            src={enhancedFileContent}
            alt={file.name || ""}
            width={width}
            height={height}
            className={cn(
              "h-auto w-auto object-cover transition-all hover:scale-105",
              aspectRatio === "portrait" ? "aspect-[3/4]" : "aspect-square",
            )}
          />
        )}
        {fileType === FileType.Video && (
          <video
            src={enhancedFileContent}
            controls
            className="h-[230px] w-auto object-cover transition-all"
          >
            <source src={enhancedFileContent} type={file.type} />
            <track kind="captions" />
          </video>
        )}
        {fileType === FileType.Document && (
          <div className="flex h-[230px] w-[150px] items-center justify-center bg-muted">
            <FileText className="h-10 w-10" />
            <Link href={{ pathname: enhancedFileContent }}>Link to file</Link>
          </div>
        )}
        {fileType === FileType.Unknown && (
          <div className="flex h-[230px] w-[150px] items-center justify-center bg-muted">
            <FileX2 className="h-10 w-10" />
            <Link href={{ pathname: enhancedFileContent }}>Link to file</Link>
          </div>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <h3 className="font-medium leading-none">{file.name}</h3>
        {file.type && (
          <p className="text-xs text-muted-foreground">{file.type}</p>
        )}
      </div>
    </div>
  );
}

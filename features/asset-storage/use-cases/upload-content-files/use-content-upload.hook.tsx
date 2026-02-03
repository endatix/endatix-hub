"use client";

import { useCallback, useState } from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import { BlockBlobClient } from "@azure/storage-blob";
import { buildContentFileMetadata } from "../../infrastructure/storage-utils";
import { ContentItemType } from "../../types";
import { useAssetStorage } from "../../ui/asset-storage.context";
import { Base } from "survey-core";

interface UseContentUploadProps {
  itemId: string;
  itemType: ContentItemType;
}

/**
 * Hook to handle content file uploads in SurveyJS Creator. Enabled only if storage is enabled.
 */
export function useContentUpload({ itemId, itemType }: UseContentUploadProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const { config: storageConfig } = useAssetStorage();

  const onUploadFile = useCallback(
    async (_sender: SurveyCreatorModel, options: UploadFileEvent) => {
      const files = options.files;
      if (!files?.length) {
        options.callback("error", "No files to upload");
        return;
      }

      let questionId: string = "N/A";
      const element = options.element;
      if (
        element &&
        element instanceof Base &&
        typeof element.getPropertyValue === "function"
      ) {
        questionId = element.getPropertyValue("name") ?? element.uniqueId;
      }

      try {
        const sasResponse = await fetch(
          "/api/hub/v0/storage/content/sas-token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId,
              itemType,
              fileNames: files.map((f: File) => f.name),
              questionId,
            }),
          },
        );

        const sasData = await sasResponse.json();
        if (!sasResponse.ok) {
          options.callback(
            "error",
            sasData.detail ?? sasData.error ?? "Failed to get upload URLs",
          );
          return;
        }

        const sasTokens = sasData.sasTokens ?? {};
        const uploadMetadata = sasData.uploadMetadata ?? {
          userId: "",
          itemId,
          contentItemType: itemType,
          questionId: questionId,
        };
        let firstUploadedUrl: string | null = null;

        for (const file of files) {
          const sasResult = sasTokens[file.name];
          if (!sasResult?.success) {
            options.callback(
              "error",
              sasResult?.message ?? `No upload URL for ${file.name}`,
            );
            return;
          }

          const sasUrl = sasResult.url;
          let dataToUpload: ArrayBuffer = await file.arrayBuffer();
          let contentType = file.type || "application/octet-stream";
          let fileState: "original" | "optimized" = "original";

          if (
            file.type.startsWith("image/") &&
            storageConfig?.imageConfig?.isResizeEnabled
          ) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              const resizeResponse = await fetch(
                "/api/hub/v0/storage/resize-image",
                { method: "POST", body: formData },
              );
              if (resizeResponse.ok) {
                dataToUpload = await resizeResponse.arrayBuffer();
                contentType =
                  resizeResponse.headers.get("Content-Type") ?? file.type;
                fileState = "optimized";
              }
            } catch {
              // On resize failure, upload original image (graceful fallback)
            }
          }

          const contentMetadata = buildContentFileMetadata({
            userId: uploadMetadata.userId,
            itemId: uploadMetadata.itemId,
            contentItemType: uploadMetadata.contentItemType as ContentItemType,
            fileName: file.name,
            fileType: contentType,
            questionId: uploadMetadata.questionId,
            fileState,
          });

          const blockBlobClient = new BlockBlobClient(sasUrl);
          await blockBlobClient.uploadData(dataToUpload, {
            metadata: contentMetadata.metadata,
            blobHTTPHeaders: {
              ...contentMetadata.blobHTTPHeaders,
              blobContentType: contentType,
            },
          });

          const [baseUrl] = sasUrl.split("?");
          if (firstUploadedUrl === null) {
            firstUploadedUrl = baseUrl;
          }
        }

        options.callback("success", firstUploadedUrl ?? "");
      } catch (error) {
        console.error("Error during content upload:", error);
        options.callback(
          "error",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    },
    [itemId, itemType, storageConfig?.imageConfig?.isResizeEnabled],
  );

  /**
   * Registers the upload handler to the SurveyJS Creator instance.
   * @param creator The SurveyCreatorModel instance.
   * @returns A cleanup function to unregister the handler.
   */
  const registerUploadHandlers = useCallback(
    (creator: SurveyCreatorModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      creator.onUploadFile.add(onUploadFile);
      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        creator.onUploadFile.remove(onUploadFile);
      };
    },
    [storageConfig?.isEnabled, onUploadFile],
  );

  return {
    registerUploadHandlers,
    isStorageReady,
  };
}

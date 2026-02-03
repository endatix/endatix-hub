"use client";

import { useCallback, useState } from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import { BlockBlobClient } from "@azure/storage-blob";
import { ContentItemType } from "../../types";
import { useAssetStorage } from "../../ui/asset-storage.context";

interface UseContentUploadProps {
  itemId: string;
  itemType: ContentItemType;
}

/**
 * Hook to handle content file uploads in SurveyJS Creator.
 * Uploads via SAS URLs (browser-to-storage). Enabled only if storage is enabled.
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

          const blockBlobClient = new BlockBlobClient(sasResult.url);
          await blockBlobClient.uploadData(await file.arrayBuffer(), {
            blobHTTPHeaders: {
              blobContentType: file.type || "application/octet-stream",
            },
          });

          const [baseUrl] = sasResult.url.split("?");
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
    [itemId, itemType],
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

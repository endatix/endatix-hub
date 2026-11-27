"use client";

import { useMemo, type ReactNode } from "react";
import {
  ImageUploadContext,
  type StoreImage,
} from "@/lib/survey-features/rich-text/ui/image-upload-context";
import { Result } from "@/lib/result";
import type { ContentItemType } from "../types";
import {
  uploadContentFiles,
  type ContentUploadConfig,
} from "../use-cases/upload/upload-handler.factory";
import { useAssetStorage } from "./asset-storage.context";
import { RichTextImageDisplay } from "./rich-text-image-display";
import type { SurveyCreatorModel } from "survey-creator-core";
import { ChoiceImageSettings } from "@/lib/survey-features/rich-text/ui/choice-image-settings";

function storeImage(config: ContentUploadConfig): StoreImage {
  return async (file) => {
    const result = await uploadContentFiles(config, [file]);
    if (Result.isError(result)) throw new Error(result.message);
    return result.value[0].url;
  };
}

interface CreatorImageStorageProps {
  creator?: SurveyCreatorModel;
  itemId: string;
  itemType: ContentItemType;
  children: ReactNode;
}

function useStoreImage({ itemId, itemType }: CreatorImageStorageProps) {
  const { config } = useAssetStorage();
  const enabled = config?.isEnabled;
  const resize = Boolean(config?.imageConfig?.isResizeEnabled);
  return useMemo(
    () =>
      enabled
        ? storeImage({
            itemId,
            itemType,
            questionName: "rich-text",
            isResizeEnabled: resize,
          })
        : null,
    [enabled, itemId, itemType, resize],
  );
}

export function CreatorImageStorage(props: CreatorImageStorageProps) {
  const store = useStoreImage(props);
  return (
    <ImageUploadContext.Provider value={store}>
      <RichTextImageDisplay>
        {props.creator ? <ChoiceImageSettings creator={props.creator} PreviewDisplay={RichTextImageDisplay}>{props.children}</ChoiceImageSettings> : props.children}
      </RichTextImageDisplay>
    </ImageUploadContext.Provider>
  );
}

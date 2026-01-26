"use client";

import { Result } from "@/lib/result";
import { use, useCallback, useEffect, useMemo } from "react";
import {
  AfterRenderHeaderEvent,
  AfterRenderQuestionEvent,
  ChoiceItem,
  QuestionImageModel,
  QuestionImagePickerModel,
  QuestionSignaturePadModel,
  SurveyModel
} from "survey-core";
import {
  ContainerReadToken,
  ReadTokenResult,
  SurveyModelWithTokens
} from "../../types";
import {
  useAssetStorage,
} from "../../ui/asset-storage.context";
import { registerProtectedFilePreview } from "./ui/protected-file-preview";

/**
 * Updates the src attribute of an image element to include a SAS token if the image is in private storage.
 */
function updateImageSrc(
  htmlContainer: Element,
  imageSrc: string,
  resolveStorageUrl: (url: string) => string,
): void {
  if (!imageSrc || !htmlContainer) return;

  const image = htmlContainer.querySelector(
    `img[src="${imageSrc}"]`,
  ) as HTMLImageElement;
  if (!image) return;

  const resolvedUrl = resolveStorageUrl(imageSrc);

  if (resolvedUrl !== imageSrc) {
    image.src = resolvedUrl;
  }
}

interface UseStorageViewProps {
  userFiles: Promise<ReadTokenResult>;
  content: Promise<ReadTokenResult>;
}

const defaultReadTokensResult = Result.success<ContainerReadToken>({
  token: null,
  containerName: "",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

const defaultReadTokensPromise = Promise.resolve(defaultReadTokensResult);

/**
 * Custom hook to handle viewing protected files from storage.
 * @param promises - The promises to use to get the read tokens. If not provided, it will try to get them from the StorageConfigContext.
 * @returns The isPrivate, setModelMetadata, and registerEventHandlers functions.
 */
export function useStorageView(promises?: UseStorageViewProps) {
  const { config: storageConfig, tokens: contextTokens, resolveStorageUrl } = useAssetStorage();

  const userFilesResult = use(
    promises?.userFiles ??
    contextTokens?.userFiles ??
    defaultReadTokensPromise,
  );
  const contentResult = use(
    promises?.content ?? contextTokens?.content ?? defaultReadTokensPromise,
  );

  const tokens = useMemo(
    () => ({
      userFiles: Result.isSuccess(userFilesResult)
        ? userFilesResult.value
        : null,
      content: Result.isSuccess(contentResult) ? contentResult.value : null,
    }),
    [userFilesResult, contentResult],
  );

  // Set metadata synchronously so it's available immediately
  // This runs during render, before useEffect, ensuring the model has the flags
  // even if event handlers haven't been registered yet
  const setModelMetadata = useCallback(
    (model: SurveyModel) => {
      if (storageConfig?.isPrivate) {
        (model as SurveyModelWithTokens).readTokens = tokens;
      }
    },
    [storageConfig?.isPrivate, tokens],
  );

  useEffect(() => {
    registerProtectedFilePreview();
  }, []);

  const registerViewHandlers = useCallback(
    (model: SurveyModel) => {
      if (!storageConfig?.isPrivate) return () => { };

      const onAfterRenderQuestion = (
        _sender: SurveyModel,
        event: AfterRenderQuestionEvent,
      ) => {
        const question = event.question;
        const questionHtml = event.htmlElement;

        const type = question.getType();

        switch (type) {
          case "imagepicker": {
            const imagePickerQuestion = question as QuestionImagePickerModel;
            imagePickerQuestion.choices.forEach((choice: ChoiceItem) => {
              updateImageSrc(
                questionHtml,
                choice.imageLink,
                resolveStorageUrl,
              );
            });
            break;
          }
          case "image": {
            const imageQuestion = question as QuestionImageModel;
            updateImageSrc(
              questionHtml,
              imageQuestion.imageLink,
              resolveStorageUrl,
            );
            break;
          }
          case "signaturepad": {
            const signatureQuestion = question as QuestionSignaturePadModel;
            updateImageSrc(
              questionHtml,
              signatureQuestion.backgroundImage,
              resolveStorageUrl,
            );
            break;
          }
          default:
            break;
        }
      };

      const onAfterRenderHeader = (
        sender: SurveyModel,
        event: AfterRenderHeaderEvent,
      ) => {
        const header = event.htmlElement;
        updateImageSrc(
          header,
          sender.locLogo.renderedHtml,
          resolveStorageUrl,
        );
      };

      model.onAfterRenderQuestion.add(onAfterRenderQuestion);
      model.onAfterRenderHeader.add(onAfterRenderHeader);

      return () => {
        model.onAfterRenderQuestion.remove(onAfterRenderQuestion);
        model.onAfterRenderHeader.remove(onAfterRenderHeader);
      };
    },
    [storageConfig, resolveStorageUrl],
  );

  return {
    setModelMetadata,
    registerViewHandlers,
  };
}

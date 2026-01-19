"use client";

import { use, useCallback, useEffect, useMemo } from "react";
import {
  AfterRenderHeaderEvent,
  AfterRenderQuestionEvent,
  ChoiceItem,
  QuestionFileModel,
  QuestionImageModel,
  QuestionImagePickerModel,
  QuestionSignaturePadModel,
  SurveyModel,
} from "survey-core";
import { Result } from "@/lib/result";
import notAllowedImageSrc from "@/public/assets/images/signs/not-allowed-image.svg";
import {
  ContainerReadToken,
  IContainerInfo,
  ProtectedFile,
  ReadTokensResult,
  SurveyModelWithTokens,
} from "../../types";
import {
  useAssetStorage,
} from "../../ui/asset-storage.context";
import { IFile } from "@/lib/questions/file/file-type";
import { registerProtectedFilePreview } from "./ui/protected-file-preview";
import { StorageConfig } from "../../infrastructure/storage-config-client";
import { resolveContainerFromUrl, isUrlFromContainer } from "../../utils";

/**
 * Updates the src attribute of an image element to include a SAS token if the image is in private storage.
 */
function updateImageSrc(
  htmlContainer: Element,
  imageSrc: string,
  readToken: ContainerReadToken | null,
  config: StorageConfig | null,
): void {
  if (!config?.isPrivate) return;

  if (!readToken) return;

  if (!isUrlFromContainer(imageSrc, readToken.containerName, config)) return;

  if (!htmlContainer) return;
  const image = htmlContainer.querySelector(
    `img[src="${imageSrc}"]`,
  ) as HTMLImageElement;
  if (!image) return;

  const hasToken = !!readToken.token;
  const updatedImageSrc = hasToken
    ? `${imageSrc}?${readToken.token}`
    : notAllowedImageSrc.src;
  image.setAttribute("src", updatedImageSrc);

  if (!hasToken) {
    image.setAttribute(
      "aria-label",
      "You are not allowed to access this image",
    );
    image.title = "You are not allowed to access this image";
  }
}




interface UseStorageViewProps {
  userFiles: Promise<ReadTokensResult>;
  content: Promise<ReadTokensResult>;
}

const defaultReadTokensResult = Result.success<ContainerReadToken>({
  token: null,
  containerName: "",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

const defaultReadTokensPromise = Promise.resolve(defaultReadTokensResult);

/**
 * Custom hook to handle viewing files from storage.
 * @param promises - The promises to use to get the read tokens. If not provided, it will try to get them from the StorageConfigContext.
 * @returns The isPrivate, setModelMetadata, and registerEventHandlers functions.
 */
export function useStorageView(promises?: UseStorageViewProps) {
  const { config: storageConfig, tokens: contextTokens } = useAssetStorage();

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
                tokens.content,
                storageConfig,
              );
            });
            break;
          }
          case "image": {
            const imageQuestion = question as QuestionImageModel;
            updateImageSrc(
              questionHtml,
              imageQuestion.imageLink,
              tokens.content,
              storageConfig,
            );
            break;
          }
          case "signaturepad": {
            const signatureQuestion = question as QuestionSignaturePadModel;
            updateImageSrc(
              questionHtml,
              signatureQuestion.backgroundImage,
              tokens.content,
              storageConfig,
            );
            break;
          }
          case "file": {
            const fileQuestion = question as QuestionFileModel;
            const files = Array.isArray(fileQuestion.value)
              ? fileQuestion.value
              : [fileQuestion.value];
            files.forEach((file: ProtectedFile) => {
              if (file?.content) {
                const fileContainer = resolveContainerFromUrl(
                  file.content,
                  storageConfig,
                );
                if (fileContainer?.containerType === "CONTENT") {
                  file.token = tokens.content?.token ?? undefined;
                }
                if (fileContainer?.containerType === "USER_FILES") {
                  file.token = tokens.userFiles?.token ?? undefined;
                }
              }
            });
            const currentShownPage =
              fileQuestion.renderedPages[fileQuestion.indexToShow];
            if (currentShownPage) {
              currentShownPage.items.forEach((item: IFile) => {
                updateImageSrc(
                  questionHtml,
                  item.content,
                  tokens.userFiles,
                  storageConfig,
                );
              });
            }

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
          tokens.content,
          storageConfig,
        );
      };

      model.onAfterRenderQuestion.add(onAfterRenderQuestion);
      model.onAfterRenderHeader.add(onAfterRenderHeader);

      return () => {
        model.onAfterRenderQuestion.remove(onAfterRenderQuestion);
        model.onAfterRenderHeader.remove(onAfterRenderHeader);
      };
    },
    [tokens, storageConfig],
  );

  return {
    setModelMetadata,
    registerViewHandlers,
  };
}

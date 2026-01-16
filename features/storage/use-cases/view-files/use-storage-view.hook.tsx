import { use, useCallback, useMemo } from "react";
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
  SurveyModelWithPrivateStorage,
} from "../../types";
import { useStorageConfig } from "../../infrastructure/storage-config.context";
import { StorageConfig } from "../../infrastructure";

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

/**
 * Resolves the container information for a given URL.
 * @param url - The URL to resolve
 * @param storageConfig - The storage configuration
 * @returns The container information if the URL matches a known container, null otherwise
 */
function resolveContainerFromUrl(
  url: string,
  storageConfig: StorageConfig | null,
): IContainerInfo | null {
  if (!url) return null;

  if (url.startsWith("data:")) return null;

  if (!storageConfig) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (storageConfig.hostName.toLowerCase() !== hostname) {
      return null;
    }

    const firstPathPart = urlObj.pathname.split("/").find((part) => part.length > 0);
    const containerName = firstPathPart?.toLowerCase() ?? null;
    if (!containerName) return null;

    if (containerName === storageConfig.containerNames.USER_FILES) {
      return {
        containerType: "USER_FILES",
        containerName: containerName,
        hostName: hostname,
        isPrivate: true,
      };
    }
    if (containerName === storageConfig.containerNames.CONTENT) {
      return {
        containerType: "CONTENT",
        containerName: containerName,
        hostName: hostname,
        isPrivate: true,
      };
    }

    // No matching container found, so return null
    return null;
  } catch {
    return null;
  }
}

/* Small helper function to check if a URL is from a specific container */
function isUrlFromContainer(
  url: string,
  containerName: string,
  storageConfig: StorageConfig | null,
): boolean {
  if (!containerName) return false;

  const resolvedContainer = resolveContainerFromUrl(url, storageConfig);

  if (!resolvedContainer) return false;

  return resolvedContainer.containerName === containerName;
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
 * @param promises - The promises to use to get the read tokens.
 * @returns The isPrivate, setModelMetadata, and registerEventHandlers functions.
 */
export function useStorageView(promises?: UseStorageViewProps) {
  const storageConfig = useStorageConfig();
  const userFilesResult = use(promises?.userFiles ?? defaultReadTokensPromise);
  const contentResult = use(promises?.content ?? defaultReadTokensPromise);

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
        (model as SurveyModelWithPrivateStorage).hasPrivateStorage = true;
        (model as SurveyModelWithPrivateStorage).readTokens = tokens;
      }
    },
    [storageConfig?.isPrivate, tokens],
  );

  const registerViewHandlers = useCallback(
    (model: SurveyModel) => {
      if (!storageConfig?.isPrivate) return () => {};

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

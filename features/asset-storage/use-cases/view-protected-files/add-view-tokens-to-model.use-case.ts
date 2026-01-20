import { Result } from "@/lib/result";
import { Model, QuestionImageModel, QuestionSignaturePadModel } from "survey-core";
import { getStorageConfig } from "../../infrastructure/storage-config";
import { ProtectedFile, StorageTokenMap } from "../../types";
import { enhanceUrlWithToken } from "../../utils";
import { generateAssetsManifest } from "./generate-assets-manifest";
import { generateGranularReadTokensUseCase } from "./generate-granular-read-tokens.use-case";

/**
 * Discovers, fetches, and applies storage tokens to a SurveyJS Model.
 * This is the primary entry point for server-side asset authorization (e.g. PDF Export).
 *
 * @param model - The SurveyJS Model to authorize
 */
export async function addViewTokensToModelUseCase(model: Model): Promise<void> {
  const storageConfig = getStorageConfig();
  if (!storageConfig.isEnabled || !storageConfig.isPrivate) {
    return;
  }

  // TODO: Replace with server-side asset manifest (see generate-assets-manifest.ts for deprecation details)
  const assetUrls = generateAssetsManifest(model);
  if (assetUrls.length === 0) {
    return;
  }

  const tokensResult = await generateGranularReadTokensUseCase(assetUrls);

  if (Result.isSuccess(tokensResult)) {
    applyTokensToModel(model, tokensResult.value);
  }
}

/**
 * Applies SAS tokens to a SurveyJS Model by mutating its question values and properties.
 * @param model - The SurveyJS Model to enrich
 * @param storageTokens - A map of storage URLs to their respective SAS tokens
 */
/**
 * Applies SAS tokens to a SurveyJS Model by mutating its question values and properties.
 * @param model - The SurveyJS Model to enrich
 * @param storageTokens - A map of storage URLs to their respective SAS tokens
 */
function applyTokensToModel(model: Model, storageTokens: StorageTokenMap): void {
  if (model.logo) {
    model.logo = enhanceUrlWithToken(model.logo, storageTokens[model.logo]);
  }

  if (model.backgroundImage) {
    model.backgroundImage = enhanceUrlWithToken(model.backgroundImage, storageTokens[model.backgroundImage]);
  }

  model.getAllQuestions(true, true, true).forEach((question) => {
    const type = question.getType();

    switch (type) {
      case "file":
      case "audiorecorder":
        {
          const files = question.value;
          if (Array.isArray(files)) {
            files.forEach((file: ProtectedFile) => {
              if (file.content && storageTokens[file.content]) {
                file.content = enhanceUrlWithToken(
                  file.content,
                  storageTokens[file.content],
                );
              }
            });
          }
          break;
        }
      case "signaturepad":
        {
          const sigModel = question as QuestionSignaturePadModel;
          if (sigModel.backgroundImage && storageTokens[sigModel.backgroundImage]) {
            sigModel.backgroundImage = enhanceUrlWithToken(
              sigModel.backgroundImage,
              storageTokens[sigModel.backgroundImage],
            );
          }
          if (typeof sigModel.value === "string" && storageTokens[sigModel.value]) {
            sigModel.value = enhanceUrlWithToken(
              sigModel.value,
              storageTokens[sigModel.value],
            );
          }
          break;
        }
      case "image":
        {
          const imgModel = question as QuestionImageModel;
          if (imgModel.imageLink && storageTokens[imgModel.imageLink]) {
            imgModel.imageLink = enhanceUrlWithToken(
              imgModel.imageLink,
              storageTokens[imgModel.imageLink],
            );
          }
          break;
        }
      default:
        break;
    }
  });
}

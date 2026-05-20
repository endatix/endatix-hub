import { IFile } from "@/lib/questions/file/file-type";
import {
  Model,
  QuestionImageModel,
  QuestionImagePickerModel,
  QuestionSignaturePadModel,
} from "survey-core";

/**
 * @deprecated This function will be removed once server-side asset manifest generation is implemented.
 * This is a temporary client-side solution that scans the SurveyJS Model to discover storage URLs.
 *
 * TODO: Replace with OSS FormDependency rows + server asset manifest on form load (h415 plan).
 * Prefetch then uses enqueuePrivateReadUrls once per manifest chunk (max 50 URLs).
 * This will eliminate client-side regex scanning and duplicate read-urls POSTs.
 *
 * Generates a manifest of all storage URLs from a SurveyJS Model.
 * @param model - The SurveyJS Model to scan
 * @returns A manifest of all storage URLs from the model
 */
export function generateAssetsManifest(model: Model): string[] {
  const urls: string[] = [];

  if (model.logo) {
    urls.push(model.logo);
  }

  if (model.backgroundImage) {
    urls.push(model.backgroundImage);
  }

  model.getAllQuestions(true, true, true).forEach((question) => {
    const type = question.getType();

    switch (type) {
      case "file":
      case "audiorecorder": {
        const files = question.value;
        if (Array.isArray(files)) {
          files.forEach((file: IFile) => {
            if (file.content) {
              urls.push(file.content);
            }
          });
        }
        break;
      }
      case "signaturepad": {
        const sigModel = question as QuestionSignaturePadModel;
        if (sigModel.backgroundImage) {
          urls.push(sigModel.backgroundImage);
        }
        if (typeof sigModel.value === "string") {
          urls.push(sigModel.value);
        }
        break;
      }
      case "imagepicker": {
        const picker = question as QuestionImagePickerModel;
        picker.choices?.forEach((choice) => {
          const link = (choice as { imageLink?: string }).imageLink;
          if (link) {
            urls.push(link);
          }
        });
        break;
      }
      case "image": {
        const imgModel = question as QuestionImageModel;
        if (imgModel.imageLink) {
          urls.push(imgModel.imageLink);
        }
        break;
      }
      default:
        break;
    }
  });

  return [...new Set(urls)];
}

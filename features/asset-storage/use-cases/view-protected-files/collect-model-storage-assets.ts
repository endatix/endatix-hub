import { DRAG_CATEGORIZE_TYPE } from "@/lib/questions/drag-categorize/constants";
import type { IFile } from "@/lib/questions/file/file-type";
import {
  Model,
  QuestionImageModel,
  QuestionImagePickerModel,
  QuestionSignaturePadModel,
} from "survey-core";

export type ModelStorageAssetRef = {
  readonly url: string;
  setUrl(nextUrl: string): void;
};

export type ModelStorageAssets = {
  readonly refs: readonly ModelStorageAssetRef[];
  readonly urls: readonly string[];
};

function addAssetRef(
  refs: ModelStorageAssetRef[],
  url: string | undefined,
  setUrl: (nextUrl: string) => void,
): void {
  if (!url || url.length === 0) {
    return;
  }

  refs.push({ url, setUrl });
}

export function collectModelStorageAssets(model: Model): ModelStorageAssets {
  const refs: ModelStorageAssetRef[] = [];

  addAssetRef(refs, model.logo, (nextUrl) => {
    model.logo = nextUrl;
  });

  addAssetRef(refs, model.backgroundImage, (nextUrl) => {
    model.backgroundImage = nextUrl;
  });

  model.getAllQuestions(true, true, true).forEach((question) => {
    const type = question.getType();

    switch (type) {
      case "file":
      case "audiorecorder": {
        const files = question.value;
        if (Array.isArray(files)) {
          files.forEach((file: IFile) => {
            addAssetRef(refs, file.content, (nextUrl) => {
              file.content = nextUrl;
            });
          });
        }
        break;
      }
      case "signaturepad": {
        const sigModel = question as QuestionSignaturePadModel;
        addAssetRef(refs, sigModel.backgroundImage, (nextUrl) => {
          sigModel.backgroundImage = nextUrl;
        });
        if (typeof sigModel.value === "string") {
          addAssetRef(refs, sigModel.value, (nextUrl) => {
            sigModel.value = nextUrl;
          });
        }
        break;
      }
      case "imagepicker": {
        const picker = question as QuestionImagePickerModel;
        picker.choices?.forEach((choice) => {
          const item = choice as { imageLink?: string };
          addAssetRef(refs, item.imageLink, (nextUrl) => {
            item.imageLink = nextUrl;
          });
        });
        break;
      }
      case "image": {
        const imgModel = question as QuestionImageModel;
        addAssetRef(refs, imgModel.imageLink, (nextUrl) => {
          imgModel.imageLink = nextUrl;
        });
        break;
      }
      case DRAG_CATEGORIZE_TYPE: {
        question.choices?.forEach((choice: { imageUrl?: string }) => {
          addAssetRef(refs, choice.imageUrl, (nextUrl) => {
            choice.imageUrl = nextUrl;
          });
        });
        break;
      }
      case "matrix": {
        // matrix-carousel rows: imageUrl lives on .rows, not .choices — the
        // only code-owned-image case keyed off that property.
        question.rows?.forEach((row: { imageUrl?: string }) => {
          addAssetRef(refs, row.imageUrl, (nextUrl) => {
            row.imageUrl = nextUrl;
          });
        });
        break;
      }
      default:
        break;
    }
  });

  return {
    refs,
    urls: [...new Set(refs.map((ref) => ref.url))],
  };
}

export enum QuestionType {
  Text = "text",
  Boolean = "boolean",
  Rating = "rating",
  Slider = "slider",
  Radiogroup = "radiogroup",
  Checkbox = "checkbox",
  Dropdown = "dropdown",
  Ranking = "ranking",
  Comment = "comment",
  File = "file",
  PanelDynamic = "paneldynamic",
  SignaturePad = "signaturepad",
  Matrix = "matrix",
  MatrixDropdown = "matrixdropdown",
  MatrixDynamic = "matrixdynamic",
  MultipleText = "multipletext",
  TagBox = "tagbox",
  Custom = "custom",
  AudioRecorder = "audiorecorder",
  DragCategorize = "dragcategorize",
  Unsupported = "unsupported",
}

export interface QuestionMetadata {
  supportedInGrid: boolean;
}

export const QUESTION_REGISTRY: Record<QuestionType, QuestionMetadata> = {
  [QuestionType.Text]: { supportedInGrid: true },
  [QuestionType.Boolean]: { supportedInGrid: true },
  [QuestionType.Rating]: { supportedInGrid: true },
  [QuestionType.Slider]: { supportedInGrid: true },
  [QuestionType.Radiogroup]: { supportedInGrid: true },
  [QuestionType.Checkbox]: { supportedInGrid: true },
  [QuestionType.Dropdown]: { supportedInGrid: true },
  [QuestionType.Ranking]: { supportedInGrid: true },
  [QuestionType.Comment]: { supportedInGrid: true },
  [QuestionType.File]: { supportedInGrid: false },
  [QuestionType.PanelDynamic]: { supportedInGrid: false },
  [QuestionType.SignaturePad]: { supportedInGrid: false },
  [QuestionType.Matrix]: { supportedInGrid: false },
  [QuestionType.MatrixDropdown]: { supportedInGrid: false },
  [QuestionType.MatrixDynamic]: { supportedInGrid: false },
  [QuestionType.MultipleText]: { supportedInGrid: false },
  [QuestionType.TagBox]: { supportedInGrid: true },
  [QuestionType.Custom]: { supportedInGrid: false },
  [QuestionType.AudioRecorder]: { supportedInGrid: false },
  // Value is a zone -> items map; there is no single cell representation.
  [QuestionType.DragCategorize]: { supportedInGrid: false },
  [QuestionType.Unsupported]: { supportedInGrid: false },
};

import { Base } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { Field, Path } from "./authored-image-fields";
import type { ImageReview } from "./embedded-images";

function at(root: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (value, key) =>
      value && typeof value === "object" ? Reflect.get(value, key) : undefined,
    root,
  );
}

function target(survey: Base, field: Field) {
  const fieldPath =
    field.path[0] === "elements" ? ["pages", 0, ...field.path] : field.path;
  let path = fieldPath.slice(0, -1);
  let key = String(field.path.at(-1));
  let locale = "default";
  let owner = at(survey, path);
  if (!(owner instanceof Base)) {
    locale = key;
    key = String(path.at(-1));
    path = path.slice(0, -1);
    owner = at(survey, path);
  }
  if (!(owner instanceof Base)) return;
  return fieldBinding(owner, key, locale);
}

function fieldBinding(owner: Base, key: string, locale: string) {
  const localized = owner.getLocalizableString(key);
  if (localized)
    return {
      read: () => localized.getLocaleText(locale),
      write: (value: string) => localized.setLocaleText(locale, value),
    };
  return {
    read: () => Reflect.get(owner, key),
    write: (value: string) => Reflect.set(owner, key, value),
  };
}

function changes(
  creator: SurveyCreatorModel,
  converted: object,
  review: ImageReview,
) {
  const fields = new Set(review.eligible.map(item => item.field));
  return Array.from(fields, field => {
      const binding = target(creator.survey, field);
      const after = at(converted, field.path);
      if (!binding || binding.read() !== field.text || typeof after !== "string")
        throw new Error("The reviewed image no longer matches its editor field.");
      return { binding, before: field.text, after };
    },
  );
}

export function matchEditorFields(
  creator: SurveyCreatorModel,
  review: ImageReview,
): ImageReview {
  const skipped = [...review.skipped];
  const eligible = review.eligible.filter(({ field }) => {
    if (target(creator.survey, field)?.read() === field.text) return true;
    skipped.push({
      location: field.location,
      reason: "The stored field could not be matched to its editor value.",
    });
    return false;
  });
  const keys = new Set(eligible.map((item) => item.key));
  return {
    eligible,
    skipped,
    files: review.files.filter((file) => keys.has(file.key)),
  };
}

/** Record one reversible editor operation: per-locale setters alone undo in the active locale. */
class ImageConversionEdit extends Base {
  constructor(private readonly apply: (stored: boolean) => void) {
    super();
  }

  set stored(value: boolean) {
    this.apply(Boolean(value));
    this.setPropertyValue("stored", value);
  }
}

function writeFields(writes: ReturnType<typeof changes>, stored: boolean) {
  const applied = [];
  try {
    for (const write of writes) {
      applied.push(write);
      write.binding.write(stored ? write.after : write.before);
    }
  } catch (error) {
    for (const write of applied.reverse())
      write.binding.write(stored ? write.before : write.after);
    throw error;
  }
}

function transaction(
  creator: SurveyCreatorModel,
  command: ImageConversionEdit,
) {
  const manager = creator.undoRedoManager;
  command.onPropertyValueChangedCallback =
    manager.onPropertyValueChanged.bind(manager);
  creator.startUndoRedoTransaction("Convert embedded images");
  try {
    command.stored = true;
  } finally {
    creator.stopUndoRedoTransaction();
  }
  return manager.peekTransaction(true);
}

export function applyImageEdit(
  creator: SurveyCreatorModel,
  inputs: { converted: object; review: ImageReview },
  changed: (stored: boolean) => void,
) {
  const writes = changes(creator, inputs.converted, inputs.review);
  const controller = creator.undoRedoController;
  const command = new ImageConversionEdit((stored) => {
    const previous = controller.ignoreChanges;
    controller.ignoreChanges = true;
    try {
      writeFields(writes, stored);
    } finally {
      controller.ignoreChanges = previous;
    }
    changed(stored);
  });
  return transaction(creator, command);
}

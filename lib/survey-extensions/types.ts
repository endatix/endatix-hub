import type { ComponentType } from "react";
import type { ICustomQuestionTypeConfiguration } from "survey-core";
import { SurveyCreator } from "survey-creator-react";
import { Survey } from "survey-react-ui";

/** Base interface for all Endatix survey extensions. */
interface EndatixExtension {
  /**
   * A unique identifier for the extension (e.g. "audio-recorder")
   */
  id: string;

  /**
   * A human-readable name for the extension (e.g. "Audio Recorder")
   */
  name: string;

  /**
   * The type of extension.
   */
  type: "question" | "init" | "model" | "creator" | "composite";

  /**
   * Optional description of the extension.
   */
  description?: string;
}

interface QuestionExtension extends EndatixExtension {
  type: "question";

  /**
   * The configuration for the question.
   */
  config: ICustomQuestionTypeConfiguration;

  // React component for rendering
  component?: ComponentType<any>;

  /** Customize the Survey Creator toolbox for this question. */
  customizeEditor?: (creator: SurveyCreator) => void;
}

/**
 * An extension that is executed before the survey model is created. Runs once. Useful for modyfying factory functions, serializers, etc.
 */
interface InitExtension extends EndatixExtension {
  type: "init";
  onInit: () => void;
}

/**
 * An extension that is executed after the survey model is created. Runs once. Useful for modifying the model after it is created.
 */
interface ModelExtension extends EndatixExtension {
  type: "model";

  /**
   * A function that is executed after the survey model is created. Runs once for the survey instance.
   * Useful for attaching event handlers to the model.
   * @param model - The survey model.
   */
  onModelCreated: (model: Survey) => void;
}

/** Extension for creator lifecycle (runs per creator instance) */
interface CreatorExtension extends EndatixExtension {
  type: "creator";

  /** Runs when Survey Creator is initialized */
  onCreatorCreated: (creator: SurveyCreator) => void;
}

/** Composite extension supporting installin multiple extensions at once */
interface CompositeExtension extends EndatixExtension {
  type: "composite";
  questions?: QuestionExtension["config"][];
  onInit?: InitExtension["onInit"];
  onModelCreated?: ModelExtension["onModelCreated"];
  onCreatorCreated?: CreatorExtension["onCreatorCreated"];
}

/** Discriminated union type for all extension types */
type Extension =
  | QuestionExtension
  | InitExtension
  | ModelExtension
  | CreatorExtension
  | CompositeExtension;

export type {
  EndatixExtension,
  QuestionExtension,
  InitExtension,
  ModelExtension,
  CreatorExtension,
  CompositeExtension,
  Extension,
};

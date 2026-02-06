import { ComponentCollection } from "survey-core";
import { ReactElementFactory, Survey } from "survey-react-ui";
import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";
import type { Extension, QuestionExtension } from "../types";

class ExtensionRegistry {
  private readonly extensions = new Map<string, Extension>();
  private initialized = false;

  /**
   * Register multiple extensions.
   */
  registerAll(extensions: Extension[]): void {
    extensions.forEach((extension) => {
      if (!this.extensions.has(extension.id)) {
        this.extensions.set(extension.id, extension);
      }
    });
  }

  getAll(): Extension[] {
    return Array.from(this.extensions.values());
  }

  getByType<T extends Extension["type"]>(type: T): Extension[] {
    return Array.from(this.extensions.values()).filter(
      (extension) => extension.type === type || extension.type === "composite",
    );
  }

  getById(id: string): Extension | undefined {
    return this.extensions.get(id);
  }

  initializeExtensions(): void {
    if (this.initialized) {
      return;
    }

    this.extensions.forEach((extension) => {
      if (extension.type === "init") {
        try {
          console.debug(`[Endatix] Initializing extension: ${extension.name}`);
          extension.onInit();
        } catch (error) {
          console.error(
            `[Endatix] Failed to init extension ${extension.id}:`,
            error,
          );
        }
      }

      if (extension.type === "composite" && extension.onInit) {
        try {
          console.debug(
            `[Endatix] Initializing composite extension: ${extension.name}`,
          );
          extension.onInit();
        } catch (error) {
          console.error(
            `[Endatix] Failed to init composite ${extension.id}:`,
            error,
          );
        }
      }

      if (extension.type === "question") {
        this.registerQuestion(extension);
      }

      if (extension.type === "composite" && extension.questions) {
        extension.questions.forEach((config) =>
          this.registerQuestion({
            ...extension,
            type: "question",
            config,
          } as QuestionExtension),
        );
      }
    });

    this.initialized = true;
  }

  /**
   * Register a custom question with SurveyJS
   */
  private registerQuestion(ext: QuestionExtension): void {
    try {
      const { config, component } = ext;

      if (ComponentCollection.Instance.getCustomQuestionByName(config.name)) {
        console.warn(
          `[Endatix] Question "${config.name}" already registered, skipping`,
        );
        return;
      }

      ComponentCollection.Instance.add(config);

      if (component) {
        ReactElementFactory.Instance.registerElement(config.name, (props) =>
          // @ts-expect-error - React.createElement is compatible with ComponentType
          React.createElement(component, props),
        );
      }

      console.log(`[Endatix] Registered question: ${config.name}`);
    } catch (error) {
      console.error(`[Endatix] Failed to register question ${ext.id}:`, error);
    }
  }

  /**
   * Survey model extensions: called when a new Survey Model is instantiated
   */
  applyModelExtensions(model: Model): void {
    this.extensions.forEach((ext) => {
      if (ext.type === "model" && ext.onModelCreated) {
        try {
          ext.onModelCreated(model as unknown as Survey);
        } catch (error) {
          console.error(
            `[Endatix] Extension ${ext.id} failed in onModelCreated:`,
            error,
          );
        }
      }

      if (ext.type === "composite" && ext.onModelCreated) {
        try {
          ext.onModelCreated(model as unknown as Survey);
        } catch (error) {
          console.error(
            `[Endatix] Composite ${ext.id} failed in onModelCreated:`,
            error,
          );
        }
      }
    });
  }

  /**
   * Survey creator lifecycle extensions: called when Survey Creator is initialized
   */
  applyCreatorExtensions(creator: SurveyCreator): void {
    this.extensions.forEach((ext) => {
      if (ext.type === "creator" && ext.onCreatorCreated) {
        try {
          ext.onCreatorCreated(creator);
        } catch (error) {
          console.error(
            `[Endatix] Extension ${ext.id} failed in onCreatorCreated:`,
            error,
          );
        }
      }

      if (ext.type === "composite" && ext.onCreatorCreated) {
        try {
          ext.onCreatorCreated(creator);
        } catch (error) {
          console.error(
            `[Endatix] Composite ${ext.id} failed in onCreatorCreated:`,
            error,
          );
        }
      }

      // Customize editor for questions
      if (ext.type === "question" && ext.customizeEditor) {
        try {
          ext.customizeEditor(creator);
        } catch (error) {
          console.error(
            `[Endatix] Question ${ext.id} failed to customize editor:`,
            error,
          );
        }
      }
    });
  }
}

const extensionRegistry = new ExtensionRegistry();

export { extensionRegistry, type ExtensionRegistry };

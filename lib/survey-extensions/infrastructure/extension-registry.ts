import React from "react";
import { ComponentCollection } from "survey-core";
import { ReactElementFactory } from "survey-react-ui";
import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";
import type { ExtensionDefinition } from "../types";
import { CustomQuestionConfig } from "@/lib/questions";

class ExtensionRegistry {
  private readonly extensions = new Map<string, ExtensionDefinition>();
  private initialized = false;

  /**
   * Register multiple extensions.
   * Silently skips duplicates to support HMR.
   */
  registerAll(extensions: ExtensionDefinition[]): void {
    extensions.forEach((extension) => {
      if (!this.extensions.has(extension.id)) {
        this.extensions.set(extension.id, extension);
      }
    });
  }

  /**
   * Get all registered extensions
   */
  getAll(): ExtensionDefinition[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extension by ID
   */
  getById(id: string): ExtensionDefinition | undefined {
    return this.extensions.get(id);
  }

  /**
   * Global initialization
   * Runs init hooks (for prototype patches, etc)
   */
  initializeExtensions(): void {
    if (this.initialized) {
      return;
    }

    this.extensions.forEach((extension) => {
      if (extension.hooks?.onInit) {
        try {
          console.log(`[Endatix] Initializing extension: ${extension.name}`);
          extension.hooks.onInit();
        } catch (error) {
          console.error(
            `[Endatix] Failed to init extension ${extension.id}:`,
            error,
          );
        }
      }
    });

    this.initialized = true;
  }

  /**
   * WIP:Register a custom question with SurveyJS. Not used yet.
   */
  private registerQuestion(ext: ExtensionDefinition): void {
    try {
      const { Component } = ext;
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
      };

      if (ComponentCollection.Instance.getCustomQuestionByName(config.name)) {
        console.warn(
          `[Endatix] Question "${config.name}" already registered, skipping`,
        );
        return;
      }

      ComponentCollection.Instance.add(config);

      if (Component) {
        ReactElementFactory.Instance.registerElement(config.name, (props) =>
          React.createElement(Component, props),
        );
      }

      console.log(`[Endatix] Registered question: ${config.name}`);
    } catch (error) {
      console.error(`[Endatix] Failed to register question ${ext.id}:`, error);
    }
  }

  /**
   * Apply model extensions
   * Called when a new Survey Model is instantiated
   */
  applyModelExtensions(model: Model): void {
    this.extensions.forEach((ext) => {
      if (typeof ext.hooks?.onModelCreated === "function") {
        try {
          ext.hooks.onModelCreated(model);
        } catch (error) {
          console.error(
            `[Endatix] Extension ${ext.id} failed in onModelCreated:`,
            error,
          );
        }
      }
    });
  }

  /**
   * Apply creator extensions
   * Called when Survey Creator is initialized
   */
  applyCreatorExtensions(creator: SurveyCreator): void {
    this.extensions.forEach((ext) => {
      // Handle Creator Extensions
      if (typeof ext.hooks?.onCreatorCreated === "function") {
        try {
          ext.hooks.onCreatorCreated(creator);
        } catch (error) {
          console.error(
            `[Endatix] Extension ${ext.id} failed in onCreatorCreated:`,
            error,
          );
        }
      }
    });
  }
}

const extensionRegistry = new ExtensionRegistry();

export { extensionRegistry, type ExtensionRegistry };

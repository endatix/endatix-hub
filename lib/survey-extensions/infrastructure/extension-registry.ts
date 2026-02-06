import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";
import type { ExtensionDefinition, ExtensionImplementation } from "../types";

/**
 * Extension Registry
 *
 * Manages extension definitions and their loaded implementations.
 * Handles initialization and lifecycle hooks.
 */
class ExtensionRegistry {
  private readonly definitions = new Map<string, ExtensionDefinition>();
  private readonly implementations = new Map<string, ExtensionImplementation>();
  private initialized = false;

  /**
   * Register extension definitions.
   * Silently skips duplicates to support HMR.
   */
  registerDefinitions(definitions: ExtensionDefinition[]): void {
    definitions.forEach((definition) => {
      if (!this.definitions.has(definition.id)) {
        this.definitions.set(definition.id, definition);
      }
    });
  }

  /**
   * Register loaded implementations.
   * Called after dynamic imports complete.
   */
  registerImplementations(
    implementations: Map<string, ExtensionImplementation>,
  ): void {
    implementations.forEach((impl, id) => {
      this.implementations.set(id, impl);
    });
  }

  /**
   * Get all registered extension definitions
   */
  getAllDefinitions(): ExtensionDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get all loaded implementations
   */
  getAllImplementations(): ExtensionImplementation[] {
    return Array.from(this.implementations.values());
  }

  /**
   * Get extension definition by ID
   */
  getDefinitionById(id: string): ExtensionDefinition | undefined {
    return this.definitions.get(id);
  }

  /**
   * Get extension implementation by ID
   */
  getImplementationById(id: string): ExtensionImplementation | undefined {
    return this.implementations.get(id);
  }

  /**
   * Phase 1: Global initialization
   * Runs init hooks once at app startup
   */
  initializeExtensions(): void {
    if (this.initialized) {
      return;
    }

    this.implementations.forEach((impl, id) => {
      if (impl.onInit) {
        try {
          const definition = this.definitions.get(id);
          console.log(
            `[Endatix] Initializing extension: ${definition?.name || id}`,
          );
          impl.onInit();
        } catch (error) {
          console.error(`[Endatix] Failed to init extension ${id}:`, error);
        }
      }
    });

    this.initialized = true;
  }

  /**
   * Phase 2: Apply form extensions
   * Called when a new Survey Model is instantiated
   */
  applyFormExtensions(model: Model): void {
    this.implementations.forEach((impl, id) => {
      if (impl.onModelCreated) {
        try {
          impl.onModelCreated(model);
        } catch (error) {
          console.error(
            `[Endatix] Extension ${id} failed in onModelCreated:`,
            error,
          );
        }
      }
    });
  }

  /**
   * Phase 3: Apply editor extensions
   * Called when Survey Creator is initialized
   */
  applyEditorExtensions(creator: SurveyCreator): void {
    this.implementations.forEach((impl, id) => {
      if (impl.onCreatorCreated) {
        try {
          impl.onCreatorCreated(creator);
        } catch (error) {
          console.error(
            `[Endatix] Extension ${id} failed in onCreatorCreated:`,
            error,
          );
        }
      }
    });
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.definitions.clear();
    this.implementations.clear();
    this.initialized = false;
  }
}

const extensionRegistry = new ExtensionRegistry();

export { extensionRegistry, type ExtensionRegistry };

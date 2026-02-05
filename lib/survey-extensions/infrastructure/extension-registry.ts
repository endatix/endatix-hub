import { Extension } from "../types";

class ExtensionRegistry {
  private readonly extensions = new Map<string, Extension>();
  private initialized = false;

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
          extension.onInit();
        } catch (error) {
          console.error(
            `🔥 Error initializing extension ${extension.id}:`,
            error,
          );
        }
      }
    });

    this.initialized = true;
  }
}

export const extensionRegistry = new ExtensionRegistry();

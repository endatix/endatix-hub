import type { IStorageProvider } from "./storage-provider.interface";

/**
 * Singleton registry for the active storage provider (one per Node process).
 */
export class StorageProviderRegistry {
  private _active: IStorageProvider | null = null;

  register(provider: IStorageProvider): void {
    if (!provider.isEnabled()) {
      console.warn(
        `[storage] Provider '${provider.name}' (${provider.id}) failed validation (not enabled); skipping registration`,
      );
      return;
    }

    if (this._active !== null) {
      console.warn(
        `[storage] Replacing active provider '${this._active.id}' with '${provider.id}'`,
      );
    }

    this._active = provider;
    console.log(
      `[storage] Registered storage provider '${provider.name}' (${provider.id})`,
    );
  }

  getActiveProvider(): IStorageProvider | null {
    return this._active;
  }

  reset(): void {
    this._active = null;
  }
}

export const storageRegistry = new StorageProviderRegistry();

/**
 * Core Extensions Registry
 *
 * This file is maintained by Endatix.
 * Contains built-in extensions that ship with the platform.
 *
 * Developers should add their extensions to hub/extensions/user-extensions.ts
 * to avoid merge conflicts when updating from upstream.
 */

import type { ExtensionDefinition } from "./types";

/**
 * Core extensions that ship with the platform.
 * Developers should add their extensions to hub/extensions/user-extensions.ts
 * to avoid merge conflicts when updating from upstream.
 * @example
 * {
 *   id: "camera-fix",
 *   type: "feature",
 *   shouldLoad: (_) => true,
 *   load: () =>
 *     import("@/extensions/camera-fix").then(
 *       (module) => module.default,
 *     ),
 */
export const coreExtensions: ExtensionDefinition[] = [];


/**
 * Get extension by ID from core registry
 */
export function getCoreExtensionById(
  id: string,
): ExtensionDefinition | undefined {
  return coreExtensions.find((ext) => ext.id === id);
}

/**
 * Get all core extensions
 */
export function getAllCoreExtensions(): ExtensionDefinition[] {
  return coreExtensions;
}

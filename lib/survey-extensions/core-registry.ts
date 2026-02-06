/**
 * Core Extensions Registry
 *
 * This file is maintained by Endatix.
 * Contains built-in extensions that ship with the platform.
 *
 * Developers should add their extensions to customizations/extensions/user-extensions.ts
 * to avoid merge conflicts when updating from upstream.
 */

import type { ExtensionDefinition } from "./types";

/**
 * Core extensions maintained by Endatix
 * These are merged with user extensions at runtime in <SurveyExtensions> component.
 * Add new core extensions here as they're developed.
 *
 * @example
 * {
 *   id: 'audio-recorder',
 *   name: 'Audio Recorder',
 *   scopes: ['form', 'editor'],
 *   shouldActivate: (json) => formUsesQuestionType(json, 'audio-recorder'),
 *   loader: () => import('@/lib/questions/audio-recorder').then((m) => m.default),
 * },
 */
export const coreExtensions: ExtensionDefinition[] = [
  // Core extensions will be added here as they're migrated
];

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

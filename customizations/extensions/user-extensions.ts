/**
 * User Extensions Registry
 *
 * This file is owned by YOU (the developer).
 * Endatix core updates won't conflict with changes here.
 *
 * Add your custom extensions to the array below.
 */

import type { ExtensionDefinition } from "@/lib/survey-extensions";
import { cameraFixExtension } from "./camera-fix";

/**
 * Your custom extensions
 *
 * Import your extensions and add them to this array.
 * They will be merged with core extensions at runtime.
 *
 * @example
 * import { myCustomWidget } from './my-custom-widget';
 *
 * export const userExtensions: ExtensionDefinition[] = [
 *   myCustomWidget,
 * ];
 */
export const userExtensions: ExtensionDefinition[] = [
  // Camera fix - forces environment-facing camera on mobile devices
  cameraFixExtension,

  // Add more extensions here
  // Example:
  // myCustomQuestion,
  // myAnalyticsExtension,
];

/**
 * User Extensions Registry
 *
 * This file is owned by YOU (the developer).
 * Update this file to add your own extensions.
 */

import type { ExtensionDefinition } from "@/lib/survey-extensions/types";

/**
 * Array of user extensions that will be loaded by the extension system.
 * Add each item with extension-definition format like in the example below
 * @example
 * Conditional extension example
 * {
 *   id: "hello-world",
 *   type: "question",
 *   shouldLoad: (_, analyzer) => analyzer.usesQuestionType("hello-world"),
 *   load: () =>
 *     import("@/extensions/questions/hello-world").then(
 *       (module) => module.default,
 *     ),
 * },
 * @example
 * Always on extension example
 * {
 *   id: "camera-fix",
 *   type: "feature",
 *   shouldLoad: (_) => true,
 *   load: () =>
 *     import("@/extensions/camera-fix").then(
 *       (module) => module.default,
 *     ),
 * },
 * @see https://github.com/endatix/endatix-platform/blob/main/hub/lib/survey-extensions/types.ts for the extension-definition format
 */
export const userExtensions: ExtensionDefinition[] = [];

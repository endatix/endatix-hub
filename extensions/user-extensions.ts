/**
 * User Extensions Registry
 *
 * This file is owned by YOU (the developer).
 * Update this file to add your own extensions.
 */

import type { ExtensionDefinition } from '@/lib/survey-extensions/types';

/**
 * Array of user extensions that will be loaded by the extension system.
 * Add each item with extension-definition format like in the example below
 * @example
 * Conditional extension example
 * {
 *   id: 'hello-world',
 *   type: 'question',
 *   loading: 'dynamic',
 *   shouldLoad: (_, analyzer) => analyzer.usesQuestionType('hello-world'),
 *   load: () =>
 *     import('@/extensions/questions/hello-world').then(
 *       (module) => module.default,
 *     ),
 * },
 * @example
 * Always on extension example
 * {
 *   id: 'camera-fix',
 *   type: 'feature',
 *   loading: 'static',
 *   shouldLoad: (_) => true,
 *   bootstrap: () => registerCameraFix(),
 * },
 * @see https://github.com/endatix/endatix-platform/blob/main/hub/lib/survey-extensions/types.ts for the extension-definition format
 */
export const userExtensions: ExtensionDefinition[] = [];

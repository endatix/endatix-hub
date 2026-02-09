/**
 * Camera Fix Extension
 *
 * Importing this module applies the patch (see camera-patch.ts).
 * The loader expects a module; we export an empty object as the implementation.
 */

import './camera-patch';
import type { ExtensionModule } from '../../lib/survey-extensions/types';

const implementation: ExtensionModule = {};

export default implementation;

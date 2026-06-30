import type { ExtensionModule } from '@/lib/survey-extensions/types';
import { registerRegexMatchGlobals } from './registry';

const regexMatchExtension: ExtensionModule = {
  onInit: () => {
    registerRegexMatchGlobals();
  },
};

export { regexMatchExtension };

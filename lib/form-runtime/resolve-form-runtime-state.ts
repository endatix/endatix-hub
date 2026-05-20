import type { FormRuntimeState } from '@/lib/form-runtime/form-runtime.context';
import type { ExtensionRuntimeState } from '@/lib/survey-extensions/types';

/**
 * Narrows extension runtime to form-runtime when `formId` is present.
 * Caller must pass a stable object (e.g. provider `stateRef.current`) so JWT cache keys match.
 */
export function resolveFormRuntimeState(
  state: ExtensionRuntimeState,
): FormRuntimeState | null {
  const formId = state.formId?.trim();
  
  if (!formId) {
    return null;
  }

  return state as FormRuntimeState;
}

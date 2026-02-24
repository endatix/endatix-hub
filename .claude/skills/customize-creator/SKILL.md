---
name: customize-creator
description: Add or extend Survey Creator (SurveyJS) features in this codebase. Use when creating hooks that attach behavior to the form/template editor, when following the registration pattern for creator plugins, or when asked how to customize the creator.
---

# Customize Survey Creator

This codebase uses a **Registration Pattern** for Survey Creator features: hooks return a **register** function that accepts the creator instance and returns a **cleanup** function. The consumer calls register when the creator is ready and uses the returned cleanup in their effect teardown.

## Why this pattern

- **Decouples config from instance**: The hook receives options (callbacks, ids) and returns a function; the component passes the creator when it exists.
- **Composable**: Multiple features can be registered in one place (e.g. storage, JSON editor, loops). Each returns its own cleanup.
- **Explicit lifecycle**: No DOM polling or "wait for element"; use creator APIs (e.g. `getPlugin('json').model`) and events instead.
- **Testable**: Registration logic can be unit-tested without mounting the full creator.
- **Fewer re-renders**: The creator instance is not put in React context; only serializable state (flags) lives in context. Components that need the creator hold it locally.

## Design Survey context (lightweight)

`DesignSurveyContext` holds only **serializable state** consumed by UI (badges, save button): `hasUnsavedChanges`, `hasJsonErrors`, `isOnJsonTab` and their setters. It does **not** hold the `SurveyCreator` instance. The editor component (FormEditor / FormTemplateEditor) keeps the creator in local `useState`, subscribes to `creator.onModified` to call `setHasUnsavedChanges(true)`, and registers feature hooks (e.g. `registerJsonEditor(creator)`) in the same effect that creates the creator. This keeps the context value stable and reduces re-renders.

## Template for a new creator feature hook

Create a hook under `hub/lib/survey-features/<feature-name>/` (e.g. `use-json-editor.hook.ts`).

```typescript
'use client';

import { useCallback } from 'react';
import type { SurveyCreatorModel } from 'survey-creator-core';

export interface UseMyFeatureOptions {
  onSomeEvent?: (value: boolean) => void;
}

/**
 * Registers my feature with the Survey Creator.
 * @returns { registerMyFeature } - Call with creator; returns cleanup.
 */
export function useMyFeature(options: UseMyFeatureOptions) {
  const { onSomeEvent } = options;

  const registerMyFeature = useCallback(
    (creator: SurveyCreatorModel): (() => void) => {
      const handler = () => {
        onSomeEvent?.(true);
      };

      creator.onModified.add(handler);
      // Or: creator.onSurveyInstanceCreated.add(...) for preview/runtime logic

      return () => {
        creator.onModified.remove(handler);
      };
    },
    [onSomeEvent],
  );

  return { registerMyFeature };
}
```

## Usage in the editor component

In `form-editor.tsx` or `form-template-editor.tsx`, keep the creator in local state and register features in the init effect:

```typescript
const [creator, setCreator] = useState<SurveyCreator | null>(null);
const { setHasUnsavedChanges, setHasJsonErrors, setIsOnJsonTab } = useSurveyDesigner();
const { registerMyFeature } = useMyFeature({ onSomeEvent: setHasUnsavedChanges });

// In the effect that creates the creator:
const newCreator = new SurveyCreator(options);
const unregisterMyFeature = registerMyFeature(newCreator);
const unregisterStorage = registerStorageHandlers(newCreator);
// ...
setCreator(newCreator);
return () => {
  unregisterMyFeature();
  unregisterStorage();
};

// Separate effect: subscribe to creator.onModified and call setHasUnsavedChanges(true).
useEffect(() => {
  if (creator === null) return;
  const setAsModified = () => setHasUnsavedChanges(true);
  creator.onModified.add(setAsModified);
  return () => creator.onModified.remove(setAsModified);
}, [creator, setHasUnsavedChanges]);
```

Add `registerMyFeature` (and any other register functions) to the init effect’s dependency array.

## Best practices

1. **Decouple config from creator**: The hook takes options (callbacks, ids). The returned register function takes only the `SurveyCreatorModel`. Do not put the creator in the hook’s dependency array; the register function is stable for a given config.

2. **Always return a cleanup function**: The register function must return a function that removes every listener or subscription it added. This avoids leaks and duplicate handlers on re-init.

3. **Use creator APIs, not DOM**: Prefer `creator.getPlugin('json').model`, `creator.onModified`, `creator.onActiveTabChanged`, and model `onPropertyChanged` over `document.querySelector` or polling for elements.

4. **Preview vs editor logic**:
   - **Editor / designer logic** (e.g. unsaved changes, toolbar): use `creator.onModified`, `creator.onActiveTabChanged`, or plugin model property changes.
   - **Preview / runtime logic** (e.g. custom question behavior in the running survey): use `creator.onSurveyInstanceCreated` and apply behavior to `options.survey` for the relevant `options.area`.

5. **Reference implementations**: See `hub/features/asset-storage/ui/hooks/use-storage-with-creator.hook.tsx` (storage) and `hub/lib/survey-features/json-editor/use-json-editor.hook.ts` (JSON tab state).

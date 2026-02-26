---

## *name: add-survey-feature
description: Add or extend Survey Creator or Survey Runner (SurveyJS) features in this codebase. Use when creating hooks that attach behavior, registering plugins, or customizing SurveyJS functionality.*

# *Add Survey Feature*

*This codebase uses a strict **Vertical Slice Architecture** combined with a **Registration Pattern** for SurveyJS features. Because SurveyJS models are heavy, mutable class instances, we bridge them to React by returning imperative registration functions that yield explicit cleanup functions.*

## *When to Use*

- *Use this skill when adding a new custom capability to the SurveyJS Creator (e.g., JSON editors, asset storage, custom properties).*
- *Use this skill when adding custom behavior to the runtime Survey Runner (e.g., question loops, dynamic visibility).*
- *This skill is helpful for ensuring features are isolated, do not cause React re-renders, and do not leak memory via lingering event listeners.*

## *Instructions*

### *1. Vertical Slicing & File Structure*

*Group feature code by domain under* `hub/lib/survey-features/<feature-name>/`*.*

- `registry.ts`*: Strictly for global registrations (*`Serializer`*,* `FunctionFactory`*).*
- `survey-bindings.ts`*: Pure functions for binding runner events.*
- `creator-bindings.ts`*: Pure functions for binding creator events.*
- `use-<feature>.hook.ts`*: The unified React hook exposing the API.*

### *2. Isolate Global Logic (*`registry.ts`*)*

*Global configurations must run exactly once per app load.*

- *Guard with a **module-level flag** (e.g.,* `let areGlobalsRegistered = false`*).*
- *Export a function (e.g.,* `registerMyFeatureGlobals()`*) and call it synchronously before* `new Model()` *or* `new Creator()` *is instantiated. Do not rely on* `useEffect` *for this, as custom properties must exist before the SurveyJS JSON parser runs.*

### *3. Isolate Instance Bindings (*`*-bindings.ts`*)*

*Write pure, imperative functions that accept the* `SurveyModel` *or* `SurveyCreatorModel`*.*

- ***Always return a cleanup function** that removes every* `.add()` *listener attached during binding.*

### *4. Hook API Design (`*use-<feature>.hook.ts`*)*

- ***Decouple config from instance**: The hook receives options (callbacks, flags) and returns registration functions.* 
- ***No reactive models**: Never pass* `SurveyModel` *or* `SurveyCreatorModel` *into the hook's arguments or* `useEffect` *dependency arrays.*
- ***Return explicit registers**: Return functions like* `registerWithCreator(creator)` *and* `bindToSurvey(survey)`*.*

### *5. Instance Reusability (*`survey.JSON` *vs* `new Model`*)*

*Whenever possible, prefer mutating* `survey.JSON = newJson` *to update a schema rather than creating a* `new Model(json)`*.* 

- *Because our bindings attach to the model instance, updating* `.JSON` *preserves all registered events.* 
- *You only need to bind events once when the model is initially created.*

### *6. Feature Orchestration (Avoiding Dependency Bloat)*

*When a component uses multiple features, do not import all hooks directly into the UI component (which bloats the* `useEffect` *dependency array). Instead, create a **Composer Hook** (e.g.,* `useSurveyCreatorFeatures`*) that aggregates them.*

## *Templates & Examples*

***Feature Hook Template (*`use-my-feature.hook.ts`*)***

```typescript
'use client';

import { useCallback } from 'react';
import type { SurveyCreatorModel } from 'survey-creator-core';
import type { SurveyModel } from 'survey-core';
import { registerMyFeatureGlobals } from './registry';

export interface UseMyFeatureOptions {
  onModified?: () => void;
}

export function useMyFeature(options: UseMyFeatureOptions) {
  const { onModified } = options;

  // 1. Synchronous Global Registration
  const initGlobals = useCallback(() => {
    registerMyFeatureGlobals();
  }, []);

  // 2. Creator Registration
  const registerWithCreator = useCallback(
    (creator: SurveyCreatorModel): (() => void) => {
      const spawnedSurveyCleanups: (() => void)[] = [];

      const handleModified = () => onModified?.();
      creator.onModified.add(handleModified);

      const handleSurveyCreated = (sender: any, options: { survey: SurveyModel }) => {
        // e.g., const cleanup = bindToSurvey(options.survey);
        // spawnedSurveyCleanups.push(cleanup);
      };
      creator.onSurveyInstanceCreated.add(handleSurveyCreated);

      return () => {
        creator.onModified.remove(handleModified);
        creator.onSurveyInstanceCreated.remove(handleSurveyCreated);
        spawnedSurveyCleanups.forEach(cleanup => cleanup());
      };
    },
    [onModified]
  );

  return { initGlobals, registerWithCreator };
}
```


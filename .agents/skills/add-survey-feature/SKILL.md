---

## *name: add-survey-feature

description: Add or extend Survey Creator or Survey Runner (SurveyJS) features in this codebase. Use when creating hooks that attach behavior, registering plugins, or customizing SurveyJS functionality.\*

# _Add Survey Feature_

_This codebase uses a strict **Vertical Slice Architecture** combined with a **Registration Pattern** for SurveyJS features. Because SurveyJS models are heavy, mutable class instances, we bridge them to React by returning imperative registration functions that yield explicit cleanup functions._

## _When to Use_

- _Use this skill when adding a new custom capability to the SurveyJS Creator (e.g., JSON editors, asset storage, custom properties)._
- _Use this skill when adding custom behavior to the runtime Survey Runner (e.g., question loops, dynamic visibility)._
- _This skill is helpful for ensuring features are isolated, do not cause React re-renders, and do not leak memory via lingering event listeners._
- _Use this skill when wiring **runtime** SurveyJS model events that should be registered in **one place** (e.g., `onChoicesLazyLoad`, `onGetChoiceDisplayValue`) and loaded deterministically via the Hub extension loader._

## _Instructions_

### _1. Vertical Slicing & File Structure_

_Group feature code by domain under_ `hub/lib/survey-features/<feature-name>/`_._

- `registry.ts`_ (or_ `infrastructure/registry.ts`_ for larger slices): Strictly for global registrations (_`Serializer`_,_ `FunctionFactory`_)._
- `survey-bindings.ts`_ (or_ `infrastructure/survey-bindings.ts`_): Pure functions for binding runner events; return a single cleanup that removes every listener and restores any injected state (e.g. visibility wrappers)._
- _Creator logic may live in_ `creator-bindings.ts`_ or be inlined in the hook; when the creator spawns survey instances (_`onSurveyInstanceCreated`_), collect each survey’s cleanup in a ref and run them all in the creator’s cleanup._
- `use-<feature>.hook.ts`_ (e.g. under_ `ui/`_): The unified hook exposing_ `initGlobals`_ and_ `bindToSurvey`_ / _`registerWithCreator`_._

### _1b. Prefer `hub/lib/survey-extensions` for runtime model events (Runner)_

_For features that primarily attach to a `SurveyModel` at runtime (e.g., REST-backed choice loading), prefer the **Survey Extensions** infrastructure so registration stays centralized and pages do not duplicate listeners._

- _Read:_ `hub/lib/survey-extensions/README.md`
- _Register extensions in:_ `hub/lib/survey-extensions/core-registry.ts` _(platform-owned; default for first-party features shipped in this monorepo)_ **or** `hub/extensions/user-extensions.ts` _(customer-owned; preferred for forks/custom deployments to reduce merge conflicts)_.
- _Load extensions through:_ `hub/lib/survey-extensions/ui/use-extension-loader.tsx` _(and pass `extensionIdsToLoad` from server components when possible)._
- _Keep `survey-features` for vertical slices that include Serializer / FunctionFactory globals, but avoid scattering `survey.on*` handlers across random UI files._

### _2. Isolate Global Logic (_`registry.ts`_)_

_Global configurations must run exactly once per app load._

- _Guard with a **module-level flag** (e.g.,_ `let areGlobalsRegistered = false`_)._
- _Export a function (e.g.,_ `registerMyFeatureGlobals()`_) and call it synchronously before_ `new Model()` _or_ `new Creator()` _is instantiated. Do not rely on_ `useEffect` _for this, as custom properties must exist before the SurveyJS JSON parser runs._

### _3. Isolate Instance Bindings (_`*-bindings.ts`_)_

_Write pure, imperative functions that accept the_ `SurveyModel` _or_ `SurveyCreatorModel`_._

- **\*Always return a cleanup function** that removes every* `.add()` *listener and restores any injected state (e.g. if you inject visibility expressions, call the corresponding “remove/restore” function in cleanup).\*

### *4. Hook API Design (`*use-<feature>.hook.ts`_)_

- **\*Decouple config from instance**: The hook receives options (callbacks, flags) and returns registration functions.\*
- **\*No reactive models**: Never pass* `SurveyModel` *or* `SurveyCreatorModel` *into the hook's arguments or* `useEffect` *dependency arrays.\*
- **\*Return explicit registers**: Return functions like* `registerWithCreator(creator)` *and* `bindToSurvey(survey)`*.\*

### _5. Instance Reusability (_`survey.JSON` _vs_ `new Model`_)_

_Whenever possible, prefer mutating_ `survey.JSON = newJson` _to update a schema rather than creating a_ `new Model(json)`_._

- _Because our bindings attach to the model instance, updating_ `.JSON` _preserves all registered events._
- _You only need to bind events once when the model is initially created._

### _6. Feature Orchestration (Avoiding Dependency Bloat)_

_When a component uses multiple features, do not import all hooks directly into the UI component (which bloats the_ `useEffect` _dependency array). Instead, create a **Composer Hook** (e.g.,_ `useSurveyCreatorFeatures`_) that aggregates them._

### _7. Lazy-loaded choices (`onChoicesLazyLoad`) vs `choicesByUrl`_

_When implementing large choice sets, prefer **lazy loading** via `SurveyModel.onChoicesLazyLoad`._

- _Enable per-question:_ `choicesLazyLoadEnabled: true` _(and optionally tune page size via `choicesLazyLoadPageSize`)._
- _In the handler, use `options.skip`, `options.take`, and `options.filter` to call your API, then:_ `options.setItems(items, totalCount)` _._
- _Do **not** assume SurveyJS will automatically fetch `choicesByUrl` when lazy loading is enabled. In modern SurveyJS versions, lazy loading is the driver; treat `choicesByUrl` as optional metadata at most (some versions ignore automatic `choicesByUrl` fetching when lazy loading is enabled)._
- _If respondents can have prefilled selected values before opening the dropdown, also implement `SurveyModel.onGetChoiceDisplayValue` to resolve labels for known values._

## _Templates & Examples_

**_Feature Hook Template (_`use-my-feature.hook.ts`_)_**

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

**Reference:** `hub/lib/survey-extensions/README.md` + `hub/lib/survey-extensions/core-registry.ts` (extension modules with explicit loading modes).

**Legacy reference (may differ by branch):** `hub/lib/survey-features/question-loops/` (older pattern: registry + survey-bindings + hook with initGlobals + bindToSurvey + bindToCreator and creator-spawned survey cleanups).

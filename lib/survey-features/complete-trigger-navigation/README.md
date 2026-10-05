# Complete trigger navigation

Per-form control for whether a Complete trigger replaces Next with Complete.

## Serializer registration is outside `onInit`

`registerCompleteTriggerNavigationProperty()` runs at module scope in `complete-trigger-navigation.extension.ts`. `onInit` does not call it.

`ENDATIX_ENABLE_EXTENSIONS` defaults off, so `onInit` does not run. An unregistered survey property is stripped by `Model.toJSON()`. The JSON editor save path is that strip: `use-json-editor.hook.ts` does `new Model()` → `fromJSON` → `toJSON()`. Moving this call back inside `onInit` before h709 lands deletes an author's stored `false` on save.

When h709 makes `onInit` unconditional, move this one call into `onInit`.

`core-registry.ts` imports the feature barrel, and `use-survey-extensions.ts` imports the registry, both statically. The barrel re-exports the extension module, so evaluating that graph registers the property before render, in both flag states. Creator bindings stay behind a dynamic import in `onCreatorReady`, so that graph does not evaluate `survey-creator-core`.

## Prototype capture

`bindChangeNavigationButtonsOnComplete` restores `model.canBeCompleted` by assigning `Model.prototype.canBeCompleted`. Capture the stock method from the prototype, not from the instance. A second bind on the same model would otherwise capture the no-op, and its disposer would restore the no-op. `delete model.canBeCompleted` does not type-check.

The disposer serves the creator rebind path only. `bindSurveyToCreatorAreas` calls it immediately before binding a different survey for that area. Respondent `onModelReady` discards the return value, so tearing a model down does not restore the method.

## Read at bind time

The boolean is read once, when the model is bound. The preview tab constructs a fresh survey each time it opens, so changing the checkbox and opening preview again picks up the new value. A property-change listener is not required.

## Assistant normalizer

`features/forms/use-cases/design-form/form-assistant.context.tsx` also normalizes with `fromJSON` → `toJSON()` and is not guaranteed to sit in a graph that mounts `useSurveyExtensions`. Harmless while those definitions are AI-generated and carry no author-set `false`. It becomes real only if the AI design flow starts round-tripping existing form definitions. Not handled here.

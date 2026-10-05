# Complete trigger navigation

Per-form control for whether a Complete trigger replaces Next with Complete.
Survey JSON property: `edxChangeNavigationOnComplete`. Omitted or `true` is
stock SurveyJS behavior; `false` keeps Next and completes when the respondent
moves on.

## Patched on the prototype, not bound per model

`installCompleteTriggerNavigationPatch()` wraps `Model.prototype` once and
reads the property live from whichever survey is rendering. There is no
per-model bind and no disposer.

An earlier version shadowed `canBeCompleted` per instance at bind time. That
made correctness depend on bind order, and two surfaces lose that race:

- `preview-form.tsx` sets `activeTab = preview` **before** `onCreatorCreated`,
  so the preview survey exists and its `onSurveyInstanceCreated` has already
  fired before any listener could be attached. `bindSurveyToCreatorAreas`
  would only catch `creator.survey`, which is the designer survey, a different
  object from the one the Preview page renders.
- `use-survey-model.hook.ts` calls `applyVariablesToModel` before
  `onModelCreated` for a resumed submission, so a trigger could already be
  recorded before the bind.

Reading the property live removes both. It also covers any surface added
later without a wiring change.

## Which seams, and why both

`completedByTriggers` bookkeeping is never suppressed, only the buttons that
read it:

- `calcIsShowNextButton` / `calcIsCompleteButtonVisible` run inside
  `withoutRecordedTriggerCompletion`, which hides the record for the duration
  of the call and restores it immediately. survey-core's own button
  expressions stay authoritative instead of being reimplemented here.
  Shadowing `canBeCompleted` instead swallowed `canBeCompleted(trigger,
  false)`, which is how survey-core withdraws a record when an expression
  stops being true, and left Complete stuck on.
- `doCurrentPageComplete` is needed because `canBeCompletedByTrigger` only
  drives button visibility; `nextPage()` never reads it. Without this seam a
  Complete trigger referencing only a variable (a screenout fed by a URL or
  metadata value) left Next in place and then advanced past it:
  `checkOnPageTriggers` passes only the current page's question values as
  changed keys, so the trigger is skipped. Flipping the flag routes the Next
  click through the same validation and `doComplete(canBeCompletedByTrigger,
  completedTrigger)` call the Complete button uses, so the completion keeps
  its trigger attribution and any `completedHtmlOnCondition` keyed to it.

The patch is a pass-through whenever the property is omitted or `true`, so
forms that do not set it are untouched.

## Serializer registration is outside `onInit`, and hidden

`registerCompleteTriggerNavigationProperty()` runs at module scope in
`complete-trigger-navigation.extension.ts`. `onInit` does not call it.

`ENDATIX_ENABLE_EXTENSIONS` defaults off, so `onInit` does not run. An
unregistered survey property is stripped by `Model.toJSON()`. The JSON editor
save path is that strip: `use-json-editor.hook.ts` does `new Model()` →
`fromJSON` → `toJSON()`. Moving this call back inside `onInit` before h709
lands deletes an author's stored `false` on save.

It registers with `visible: false`. `revealCompleteTriggerNavigationProperty()`
shows the checkbox from `onInit`, which only runs when extensions are enabled,
so an author never sees a control on a Hub where the behavior is not
installed. Serialization does not depend on the reveal.

When h709 makes `onInit` unconditional, move the register into `onInit` and
drop the hidden/reveal split.

`core-registry.ts` imports the feature barrel, and `use-survey-extensions.ts`
imports the registry, both statically. The barrel re-exports the extension
module, so evaluating that graph registers the property before render, in both
flag states. Creator bindings stay behind a dynamic import in
`onCreatorReady`, so that graph does not evaluate `survey-creator-core`.

## Assistant normalizer

`features/forms/use-cases/design-form/form-assistant.context.tsx` also
normalizes with `fromJSON` → `toJSON()` and is not guaranteed to sit in a
graph that mounts `useSurveyExtensions`. Harmless while those definitions are
AI-generated and carry no author-set `false`. It becomes real only if the AI
design flow starts round-tripping existing form definitions. Not handled here.

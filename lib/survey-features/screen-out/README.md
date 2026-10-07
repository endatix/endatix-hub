# Screen out

A SurveyJS trigger that ends the interview as screened out. Hub's first custom
trigger; the reference for adding more (skill `add-survey-feature` §12).

```json
"triggers": [{ "type": "screenout", "expression": "{age} = 'under_18'" }]
```

`screenouttrigger` extends `completetrigger`, so the respondent sees the
thank-you page (use `completedHtmlOnCondition` for a screen-out message).
On `onComplete`, `survey-component.tsx` calls `isScreenedOutOnComplete`
(`completion-outcome.ts`) and saves the submission with `isComplete: false` and
`collectionOutcome: "screen_out"`. It checks `completeTrigger` and also any
screen-out trigger whose expression still holds, because "Try again" omits the
trigger and a screen-out must win over a Complete trigger that also holds.
Fixture: `__tests__/fixtures/age-gate.json`.

## Registration

| Piece | Where | Flag |
| ----- | ----- | ---- |
| Serializer class | module scope, `screen-out.extension.ts` | always |
| Respondent outcome | `features/public-form/ui/survey-component.tsx` | always |
| Creator labels + Logic tab action | `onCreatorReady` → `creator-bindings.ts` | `ENDATIX_ENABLE_EXTENSIONS=true` |

The Serializer class registers at module scope because it is part of the form
JSON schema: an unregistered trigger type is dropped by `fromJSON` → `toJSON`,
including the Creator load and JSON editor save paths.

With `ENDATIX_ENABLE_EXTENSIONS` off, saved screen-out triggers keep working
and survive editing, but Creator shows the type as `screenouttrigger` in the
property grid and the Logic tab has no "Screen out" action. Turn the flag on
wherever authors build screen-out logic. [#709](https://github.com/endatix/endatix-hub/issues/709)
removes the flag.

Do not call the Creator bindings from editor or preview hosts. `onCreatorReady`
resolves after `new SurveyCreator`; `bindScreenOutToCreator` calls
`creator.updateLocalizedStrings()` so already-rendered choices pick up the label
(`__tests__/creator-bindings.test.ts`).

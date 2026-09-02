---
name: add-survey-feature
description: >-
  Add or extend SurveyJS / Survey Creator platform features in Hub using the
  survey-extensions framework. Use when implementing survey behavior (event
  handlers, Serializer properties, Creator settings), registering a core
  extension, or reviewing survey-feature PRs. Reference implementation:
  lib/survey-features/blind-search-tagbox.
---

# Add Survey Feature (Hub)

Use this skill when adding **platform** SurveyJS behavior (not Endatix business
features under `features/`). The **extensions framework** is the primary install
path — see the ongoing consolidation plan:
`h709-extensions-framework-first-class-plan.md` (endatix-saas monorepo, `.cursor/plans/`).

**Canonical example:** [lib/survey-features/blind-search-tagbox](lib/survey-features/blind-search-tagbox)

**Do not** add `initGlobals` / `bindToCreator` calls in `form-editor` for new
survey features. Wire through `ExtensionModule` + `core-registry.ts` (or
`extensions/user-extensions.ts` for self-hosted customizations).

---

## 1. Decide scope

| Kind | Where the code lives | `type` | Registry | Example |
|------|----------------------|--------|----------|---------|
| Behavior on existing question types (tagbox, dropdown, …) | `lib/survey-features/{feature}/` | `feature` | `core-registry.ts` | blind-search-tagbox |
| Always-on expression / formatting helper | `lib/survey-features/{feature}/` | `feature` + `static` | `core-registry.ts` | expression-formatting |
| **Code-owned question type** | **`lib/questions/{question}/`** | `question` | `core-registry.ts` (adapter) | audio-recorder, drag-categorize |
| Self-hosted / JSON ComponentCollection question | `hub/extensions/questions/` | `question` | `user-extensions.ts` | hello-world, country |

**A new question type is not a survey feature.** `survey-features/` is for behavior
layered onto question types SurveyJS already ships. A question type you own in code
is a standalone unit that must render on **every** surface — see §11.

**Not in scope here:** API-persisted custom questions (`createCustomQuestionAction`),
`hub/customizations/` (deprecated — see h709), or vertical slices under
`features/forms/`.

---

## 2. Folder layout

Create under `lib/survey-features/{feature-name}/`:

```text
lib/survey-features/{feature-name}/
├── constants.ts                    # Property names, question types, magic keys
├── types.ts                        # Question / runtime TypeScript interfaces
├── index.ts                        # Curated public exports
├── utils/                          # Pure helpers (queries, transforms, graph) — no SurveyJS side effects
│   ├── index.ts
│   └── __tests__/
├── use-cases/
│   └── sync-{target}.ts            # Single verb use-cases (orchestrate utils, no bindings)
├── infrastructure/
│   ├── registry.ts                 # Serializer.addProperty / global registration
│   ├── survey-bindings.ts          # Model event handlers (respondent runtime)
│   ├── creator-bindings.ts         # SurveyCreator wiring (designer preview)
│   ├── {feature}-sync.ts           # Sync orchestration, re-entrancy guards (if needed)
│   └── {feature}.extension.ts      # ExtensionModule entry (onInit / onCreatorReady / onModelReady)
└── __tests__/
    ├── registry.test.ts
    └── survey-bindings.test.ts
```

Rules:

- **Shares helpers** in `utils/` — queries, transforms, graph logic; test without SurveyJS when possible.
- **Use-cases** in `use-cases/` — single verb orchestration (e.g. `syncSingleCarryForwardTarget`); focus on domain/feature based use-case. no event bindings.
- **Side effects** only in `infrastructure/` — bindings, dependencies, sync guards.
- **One** `ExtensionModule` per feature in `{feature}.extension.ts`.
- Do **not** add `ui/use-{feature}.hook.ts` with `initGlobals` / `bindToCreator`
  unless the feature needs React state (e.g. loading API data). Paged pickers
  belong in `PropertyGridLazyChoiceProvider` (see data-lists `edxDataListId`);
  do not block Creator init on a full catalog. Install hooks are not the load path.

---

## 3. Extension module lifecycle

Implement `ExtensionModule` ([lib/survey-extensions/types.ts](lib/survey-extensions/types.ts)):

```typescript
const myFeatureExtension: ExtensionModule = {
  // Runs when extension is selected for this session (see shouldLoad).
  // Serializer metadata, shared guard registries, FunctionFactory, etc.
  onInit: () => {
    registerMyFeatureGlobals();
  },

  // Designer: after SurveyCreator is constructed — call onCreatorCreated from useSurveyExtensions.
  onCreatorReady: (creator, deps) => {
    bindMyFeatureToCreator(creator);
  },

  // Respondent / standalone Model — call onModelCreated from useSurveyExtensions.
  onModelReady: (model, deps) => {
    bindMyFeatureToSurvey(model);
  },
};
```

### Hook responsibilities

| Hook | When | Examples |
|------|------|----------|
| `onInit` | Once per selected extension | `Serializer.addProperty`, `registerChoicesLazyLoadGuard` |
| `onCreatorReady` | Each `SurveyCreator` instance | `onSurveyInstanceCreated` → bind preview surveys |
| `onModelReady` | Each `Model` instance | `onChoicesSearch`, `onValueChanged` |

Read runtime context via `deps.getRuntimeState()` inside hooks when you need
`formId`, JWT, etc. Do not attach Endatix state onto SurveyJS model objects.

**Binding idempotency (707):** Features may use `__endatix*Bound` sentinels on
`SurveyCreator` / `Model` for now (matches data-lists). **Target (h709 PR-3b):**
Hub-owned `WeakMap` side tables in
`lib/survey-extensions/infrastructure/extension-binding-state.ts` — same approach
as `runtimeStateByQuestion` in blind-search survey-bindings and
`inflightByState` in `form-access-jwt-orchestrator.ts`. New features should prefer
WeakMap helpers once PR-3b lands.

### Designer vs respondent loading

Consumers use [useSurveyExtensions](lib/survey-extensions/ui/use-survey-extensions.ts):

- **Designer** (`form-editor`, `form-template-editor`): no `formJson` → all
  extensions load; `onCreatorReady` runs after `new SurveyCreator()`.
- **Respondent** (`survey-js-wrapper`): passes `formJson` → extensions without
  `shouldLoad` always load; optional `shouldLoad` filters the rest (prefer server
  manifest later — see §4).

`form-editor` already calls `useSurveyExtensions` and `onCreatorCreated(creator)`.
**Do not** duplicate install logic there.

---

## 4. Register in core-registry

Add to [lib/survey-extensions/core-registry.ts](lib/survey-extensions/core-registry.ts):

```typescript
import { myFeatureExtension } from '@/lib/survey-features/my-feature';

export const MY_FEATURE_EXTENSION_ID = 'my-feature';

{
  id: MY_FEATURE_EXTENSION_ID,
  type: 'feature',
  loading: 'static', // prefer static for core platform features
  module: myFeatureExtension,
  metadata: {
    name: 'My Feature',
    description: '…',
  },
},
```

### `loading`: static vs dynamic

| Mode | Use when |
|------|----------|
| **`static`** | Core platform features (blind-search, data-lists, expression-formatting). Eager module import; bindings no-op unless the question uses the feature. |
| **`dynamic`** | Large optional add-ons, tenant-specific bundles, or rare question types. Use `load: () => import('…').then(m => m.default)`. |

### `shouldLoad` — when to use (and when not to)

**Default for core platform features: omit `shouldLoad`.** Load the extension eagerly;
gate behavior inside bindings / use-cases (e.g. `isBlindSearchEnabled`) per question.
SurveyJS loads question types eagerly for the same reason — extension `onInit` and
handler registration are nanoseconds compared to parsing multi-MB form JSON on every
respondent page load.

| Approach | Cost | Use when |
|----------|------|----------|
| **No `shouldLoad` (eager)** | Static module + cheap per-event guards | Core features on common question types (tagbox, dropdown) |
| **`usesQuestionType` only** | Regex scan on JSON string — still O(form size) | Large optional bundles tied to a question type |

Do not traverse or fully parse form JSON on the client to detect custom Serializer
properties — use eager core extensions with per-question guards, or (future) a
server-side extension manifest from `FormDependency`.

Extensions without `shouldLoad` are always included when the extension loader runs.

**Future (SSR):** Server-maintained dependency manifest via
`FormDependency` (endatix-saas monorepo, `oss/src/Endatix.Core/Entities/`) will
record which extensions a form needs. Hub pages will pass `extensionIdsToLoad` from
that manifest (whitelist) instead of client-side JSON analysis.

---

## 5. Cross-feature infrastructure and shared utilities

### Utils hierarchy — check before adding slice-local helpers

| Layer | Path | Use for |
|-------|------|---------|
| Generic | `lib/utils/` | Domain-agnostic parse/format (`type-parsers.ts`, `type-validators.ts`) |
| SurveyJS shared | `lib/utils/survey/` | Reusable SurveyJS compute/copy (`getChoicesFromSourceQuestion`, `copyChoiceItem`, `normalizeChoiceKey`, `extractUniqueChoicesBy`) |
| Platform cross-feature | `lib/survey-features/infrastructure/` | Extension wiring shared across slices (`creator-survey-bindings`, `choice-source-mutual-exclusion`, lazy-load guards) |
| Feature slice | `lib/survey-features/{feature}/` | edx Serializer props, Creator registry, bindings, feature-only product rules |

**Rules:**

- Use `parseScalarString` / `parseNumber` from [`lib/utils/type-parsers.ts`](lib/utils/type-parsers.ts) — do not hand-roll `String(value)` or `parseInt` in slices.
- SurveyJS choice semantics (visibleChoices, isBuiltInChoice, isItemSelected) belong in `lib/utils/survey/`, not duplicated per feature.
- Cross-feature mutual exclusion (data list vs carry forward vs URL) → `lib/survey-features/infrastructure/choice-source-mutual-exclusion.ts`.
- Prefer **extend** existing slices + shared utils over parallel implementations (see [`carry-forward`](lib/survey-features/carry-forward/) vs reusing `question-loops` internals incorrectly).

**Canonical examples:** [`blind-search-tagbox`](lib/survey-features/blind-search-tagbox) (single-source feature), [`carry-forward`](lib/survey-features/carry-forward) (multi-source + SurveyJS `addDependedQuestion`).

Shared registries live in `lib/survey-features/infrastructure/` (e.g.
`choices-lazy-load-guards.ts`). Register from your feature's `onInit`, not from
`form-editor`.

**data-lists layout (reference for cross-feature reuse):**

```text
lib/survey-features/data-lists/
├── types.ts
├── utils/                    # property-grid-source-choices, with-form-access-jwt-retry
├── use-cases/
│   ├── search-data-list-choices.ts      # respondent + creator API search
│   ├── resolve-data-list-display-values.ts
│   ├── load-choices-in-creator.ts       # low-level static + multi-list paging
│   ├── load-multi-source-choices-in-creator.ts
│   └── resolve-multi-source-display-values.ts
└── infrastructure/
    ├── property-grid-lazy-choice-registry.ts
    ├── survey-bindings.ts
    └── creator-bindings.ts
```

Cross-feature consumers should import **use-cases** and **utils** directly (not the
data-lists `index.ts` barrel) to avoid pulling UI hooks into survey-feature tests.

Reference: carry-forward `edxCarryForwardPriorityItems`, question-loops `priorityItems`
(issue #717).

---

## 6. Image and file uploads

The hub has two pre-wired upload paths. **Do not add a new `onUploadFile` / `onUploadFiles` handler** — plug into the existing ones instead.

### Creator-side (property-level images, content uploads)

`form-editor.tsx` calls `registerStorageHandlers(creator)` from `useStorageWithCreator`, which registers `creator.onUploadFile` via `useContentUpload`. This handler intercepts **all** file uploads triggered by the Creator UI — including property-level image pickers.

**What you must do:** Declare image properties with **`type: "file"`** in `Serializer.addClass` / `Serializer.addProperty`. No other wiring is needed; the existing handler picks them up automatically.

```typescript
Serializer.addClass("myquestionitem", [
  { name: "imageUrl", type: "file", displayName: "Image" },
], ...);
```

> **Use `file`, not `image`.** The Creator picks a property editor by matching
> the property type: `PropertyGridLinkEditor.fit` accepts `"file"` and `"url"`
> and renders a `fileedit` control (Select File button + URL field) with
> `storeDataAsText: false`, which is what routes the upload through
> `creator.onUploadFile`. This is the type SurveyJS uses for its own image
> properties — image picker choices are declared `imageLink:file`. An
> unrecognized type such as `"image"` does not error; the property grid
> silently falls back to a plain text box with no upload button, so assert the
> property type in a registry test.

**On a collection item (a `choices`-style array), add `showMode: "form"`:**

```typescript
Serializer.addClass("myquestionitem", [
  { name: "imageUrl", type: "file", displayName: "Image", showMode: "form" },
], ...);
```

A property-grid **matrix cell cannot host the `fileedit` control**. Left as a
table column, the property degrades to `cellType: "text"` — the placeholder
("Select a file or paste a file link…") still renders, so it looks like a file
input, but there is no Select File button and the only way to set a value is
pasting a URL. `showMode: "form"` excludes the property from the columns and
places it in the row's expanded detail panel, where it becomes a real question
and gets the full editor. Verify with a Creator test that asserts the property
is absent from `propertyGrid.getQuestionByName("choices").columns` and present
in the row detail panel with type `fileedit`.

Relevant files:
- `features/asset-storage/use-cases/upload-content-files/use-content-upload.hook.tsx` — registers `creator.onUploadFile`
- `features/asset-storage/ui/hooks/use-storage-with-creator.hook.tsx` — called by `form-editor.tsx`

### Runner-side (respondent file uploads)

`survey-component.tsx` calls `useStorageWithSurvey`, which registers `model.onUploadFiles`. This covers file-type questions and any model that fires `onUploadFiles`.

Custom question models that need file upload support should set `waitForUpload = true` and `storeDataAsText = false` (see `AudioQuestionModel`). The runner-side handler is already active; no extra wiring is required in the extension.

Relevant files:
- `features/asset-storage/use-cases/upload-user-files/use-storage-upload.hook.tsx` — registers `model.onUploadFiles`
- `features/asset-storage/ui/hooks/use-storage-with-survey.hook.tsx` — called by `survey-component.tsx`

### What NOT to do

- Do not register a new `creator.onUploadFile` handler in `creator-bindings.ts` or `ExtensionModule` — it will double-upload or shadow the existing handler.
- Do not store uploaded images as base64 in the JSON. Use `type: "image"` in the Serializer and the existing handler returns a storage URL.

---

## 7. Tests

Follow AAA pattern in `__tests__/`:

1. **`use-cases`** — pure functions, no SurveyJS mount.
2. **`registry`** — Serializer properties exist, idempotent `register*Globals`.
3. **`survey-bindings`** — `Model` + event firing for runtime behavior.

Run: `pnpm test` from `hub/` (filter by feature path).

---

## 8. Checklist before opening PR

- [ ] `ExtensionModule` owns all install logic (no `form-editor` `initGlobals`)
- [ ] Entry in `core-registry.ts` (or `user-extensions.ts`); omit `shouldLoad` for core features unless bundle size demands it
- [ ] `loading: 'static'` for core features unless bundle size requires `dynamic`
- [ ] Pure logic extracted to `use-cases/` (or `lib/utils/survey/` when reusable across features)
- [ ] No new parse/format helpers in slice without checking `lib/utils` and `lib/utils/survey`
- [ ] `creator-bindings.ts` and `survey-bindings.ts` separated
- [ ] Tests for state, registry, and bindings
- [ ] `ENDATIX_ENABLE_EXTENSIONS=true` required until h709 PR-2 lands (extensions off = runtime no-op)

---

## 9. Legacy patterns (do not copy)

| Legacy | Replacement |
|--------|-------------|
| `useBlindSearchTagbox`-style install hooks in `form-editor` | `ExtensionModule` lifecycle |
| `hub/customizations/questions/` + `discover-questions.mjs` | `hub/extensions/questions/` + `user-extensions.ts` |
| Manual `initDataListsGlobals()` etc. in `form-editor` | h709: `onRegisterGlobals` + single designer bootstrap |
| Greedy `customQuestions` loop in `form-editor` | Extension registry + designer load-all |
| Client JSON property traversal in `shouldLoad` on large forms | Eager core extension + per-question guards; future `FormDependency` SSR manifest |

---

## 10. Further reading

- [lib/survey-extensions/README.md](lib/survey-extensions/README.md) — loader, server analyzer, authorized extensions
- [extensions/README.md](extensions/README.md) — self-hosted custom extensions
- `h709-extensions-framework-first-class-plan.md` (endatix-saas monorepo, `.cursor/plans/`) — experimental flag removal, customizations sunset, unified designer bootstrap

---

## 11. Code-owned question types (`lib/questions/`)

A question type you implement in code is **not** a survey feature. It lives in
`lib/questions/{question}/` and owns every surface its answers appear on.
**Canonical example:** [lib/questions/drag-categorize](lib/questions/drag-categorize).

Do **not** copy [audio-recorder](lib/questions/audio-recorder)'s module-scope
`registerXQuestion()` on feature surfaces — that pattern predates the
extensions framework and will be migrated later.

### Registration path (extensions framework)

1. Implement `registerXModel` / `registerXQuestion` / Creator helpers as
   **internal** entry points in the question folder.
2. Add a thin `ExtensionModule` (`x.extension.ts`) whose `onInit` calls
   `registerXQuestion()` (and feature opt-ins such as carry-forward) and whose
   `onCreatorReady` dynamically imports Creator bindings.
3. Register in [core-registry.ts](lib/survey-extensions/core-registry.ts) as
   `type: 'question'`, `loading: 'static'`, **omit `shouldLoad`**.
4. Every **client** survey surface must call `useSurveyExtensions` and **must
   not** construct a `Model` / `SurveyCreator` until `isReady` is true.
5. Require `ENDATIX_ENABLE_EXTENSIONS=true` until h709 removes the experimental
   gate (extensions off = question type silently missing at parse time).

```typescript
// x.extension.ts — sole client registration path
const xExtension: ExtensionModule = {
  onInit: () => {
    registerXQuestion();
    registerCarryForwardForQuestionType(X_TYPE);
  },
  onCreatorReady: async (creator) => {
    const { bindXToCreator } = await import('./x.creator');
    bindXToCreator(creator);
  },
};
```

### Surfaces you must cover

An answer that renders in the runner but nowhere else is an incomplete question.
Fallbacks print raw JSON — add an explicit case for each:

| Surface | Wire-up |
|---------|---------|
| Runner / previews / submission view-edit / designer | Parent already calls `useSurveyExtensions` + `isReady` (e.g. survey-js-wrapper, view/edit-submission-core); do **not** re-wire inside nested survey components |
| Submission details | component in the question folder + case in `features/submissions/ui/answers/answer-viewer.tsx` |
| PDF export | model-only `registerXModel()` in `preparePdfModel` + case in `pdf-answer-viewer.tsx` (sole allowed non-extension register — Node has no React loader) |
| Submission grid | entry in `lib/questions/questions-registry.ts` (`QuestionType` + `supportedInGrid`) |
| Private-storage images | collect item URLs in `collect-model-storage-assets.ts` |

### Split modules (internal helpers)

Keep **model registration free of React** so PDF can import without
`survey-react-ui` / stylesheets:

```typescript
// x.registry.ts      — Serializer + QuestionFactory only. Server-safe.
export function registerXModel(): void { … }

// x.component.tsx    — calls registerXModel(), then ReactQuestionFactory
export function registerXQuestion(): void { … } // called from extension onInit

// x.creator.ts       — icon + pehelp + bindXToCreator
export function bindXToCreator(creator: SurveyCreatorModel): void { … }
```

Do not import the question barrel from respondent graphs (it may re-export
Creator bindings). Deep-import the surface-appropriate module.

### Opting into survey features (carry forward, …)

Features in `survey-features/` keep a built-in type list (e.g.
`CARRY_FORWARD_QUESTION_TYPES`). **Do not add a code-owned question type to
that list.** Call the feature's per-type opt-in from the question extension's
`onInit`, **after** `registerXQuestion()`, so the Serializer class exists and
the opt-in stays gated by `ENDATIX_ENABLE_EXTENSIONS` like other core features.

### Known gaps (h709 / h742 — do not fix in feature PRs)

| Gap | Today's workaround | Owner |
|-----|-------------------|-------|
| `core-registry` entry does not auto-run `onInit` | Every surface calls `useSurveyExtensions` | h709 unified bootstrap |
| `onInit` runs in `useEffect` (after paint) | Gate `new Model` on `isReady` | h742 sync globals on survey surfaces |
| Flag defaults off | Document `ENDATIX_ENABLE_EXTENSIONS=true` as required | h709 remove experimental gate |
| No Node/server extension loader | PDF keeps `registerXModel()` | h709/h742 server-safe bootstrap |
| Per-surface `isReady` glue duplicates | Accept until bootstrap lands | h709 remove per-surface glue |

# Public status pages

Every page a **non-Hub reader** (a form respondent, a link or export recipient) sees instead of
what they came for. The UX pattern — two audiences, anatomy, tones, copy — is `DESIGN.md` §6
"Public status pages". This file is the inventory and the wiring rules.

**Add a state by adding a caller**, not a stylesheet: pick an icon and a tone, render
`PublicStatusPage`, add a row below in the same change.

## Inventory

| Route                                          | Trigger                                                                                              | Rendered by                                                           | Icon · tone                                                         |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `/share`, `/embed`                             | Host closed the form (403 `form_unavailable`)                                                        | `PublicFormAccessError` kind `formUnavailable`                        | `ClipboardX` · neutral                                              |
| `/share`, `/embed`                             | Private form, no session (401)                                                                       | `PublicFormAccessError` kind `unauthorized` (+ Sign in)               | `LockKeyhole` · neutral                                             |
| `/share`, `/embed`                             | Any other 403 on the access check                                                                    | `PublicFormAccessError` kind `forbidden`                              | `ShieldX` · neutral                                                 |
| `/share`, `/embed`                             | Access check failed (network, 5xx)                                                                   | `PublicFormAccessError` kind `accessLoadError`                        | `TriangleAlert` · warning                                           |
| `/share`, `/embed`                             | `?token=` invalid or expired (one page), forbidden, not found                                        | `TokenSubmissionError` (expired: + close-tab note, page only)         | `Hourglass` / `ShieldX` / `SearchX` · neutral                       |
| `/share`, `/embed`                             | `?token=` without submit permission                                                                  | route `page.tsx`                                                      | `ShieldX` · neutral                                                 |
| `/share`, `/embed`                             | Respondent already submitted (single-response form)                                                  | `AlreadyResponded` (host `alreadyResponded` metadata)                 | `ClipboardCheck` · success                                          |
| `/share`, `/embed`                             | Submission already completed                                                                         | `SubmissionAlreadyCompleted`                                          | `CircleCheck` · success                                             |
| `/share`, `/embed`                             | Survey model failed to build client-side                                                             | `SurveyComponent`                                                     | `TriangleAlert` · warning                                           |
| `/share`, `/embed`                             | Unexpected render error                                                                              | route `error.tsx` → `PublicFormUnexpectedError` (+ Try again, digest) | `TriangleAlert` · warning                                           |
| `/share/[formId]`, `/embed/[formId]`, `/share` | Unknown form (404)                                                                                   | route `not-found.tsx`                                                 | `SearchX` · neutral                                                 |
| `/view`, `/edit`                               | Bad id, missing / forbidden token, invalid or expired token (one page), not found, definition failed | `SubmissionLinkError` (verb = view / edit)                            | as token errors; incomplete link → `Link2Off`; definition → warning |
| `/export-error`                                | Browser PDF export failed (redirect with `?code=&ref=`)                                              | `ExportErrorCard` (+ note, support reference)                         | per code; retryable → warning                                       |
| `/maintenance` (proxy rewrite, 503)            | `MAINTENANCE_MODE=true` — Hub, `/embed`, `/view`, `/edit` (`/share` is outside the proxy matcher)    | route `page.tsx`, copy from `MAINTENANCE_*` env                       | `Construction` · neutral                                            |
| `/maintenance`                                 | Opened directly while maintenance is off (404)                                                       | route `not-found.tsx`                                                 | `SearchX` · neutral                                                 |

**Supporting components** on the same pages:

| Component                                 | Owns                                                                                    |
| :---------------------------------------- | :-------------------------------------------------------------------------------------- |
| `PublicStatusReference`                   | Copyable support id (trace id, error digest) — the only diagnostic shown                |
| `EmbedHeightReporter`                     | Posts iframe height for every embed status page                                         |
| `EmbedAlreadyRespondedReporter`           | Tells the host page the respondent already responded                                    |
| `PublicSurveySkeleton`                    | The loading state before any of the above resolves                                      |
| `TestSubmissionBadge`, `LanguageSelector` | Chrome around a live survey — not status pages, listed so they are not mistaken for one |

**Out of this family, on purpose:**

- **In-form errors** — validation messages and `showSaveError` after a failed submit — are
  SurveyJS UI inside the survey and carry the tenant's survey theme. Do not replace them with a
  status page; the respondent must keep their answers.
- **Hub pages** keep `ErrorPage`: `global-not-found`, `app/error`, `global-error`,
  `(main)/error`, `(main)/not-found`, `unauthorized`, `auth-error`. Known drift:
  `(main)/forbidden.tsx` hand-rolls a card with raw `red-*` classes instead of `ErrorPage`.

## Wiring rules

- **Palette.** Neutral slate in `public-status-page.module.css`: `/share` and `/embed` do not
  load `globals.css` (see `lib/themes/README.md`), and must not borrow the Hub palette. One
  component serves routes with and without Tailwind.
- **Theme follows the reader's OS.** `layout="page"` owns the viewport (fixed, full-bleed canvas,
  its own `color-scheme`) and follows `prefers-color-scheme`. The Hub keeps its theme in
  `localStorage` on the **same origin**, so a public page that mounts next-themes paints an
  operator's Hub preference onto a respondent-facing page.
- **Embed is light and opaque.** `layout="embed"` paints `#f3f3f3`
  (`DEFAULT_FILL_BACKGROUND_COLOR`) with `color-scheme: light`, like the survey it replaces
  (light until respondent dark mode is decided, endatix-hub#725). Never transparent: the host
  page is unknown.
- **Public layouts take `AppOptions` from `components/providers/app-options.ts`.** `PublicPages`
  (share, embed, view, slack) and `StatusPages` (maintenance, export error) keep the theme
  provider off. A value exported from a `"use client"` module reaches a server layout as a
  client reference, so importing `AppOptions` from `app-provider.tsx` silently gave every public
  page the all-on Hub defaults. Guarded by `components/providers/__tests__/app-options.test.ts`.
- **Embed reports its height.** An embed caller renders `EmbedHeightReporter` (or
  `EmbedAlreadyRespondedReporter`) beside `PublicStatusPage`; the component does not own
  messaging. Embed has no `min-height`, so the iframe sizes to content.
- **Every public route that can throw has its own `error.tsx`.** Otherwise a crash falls through
  to the Hub `app/error.tsx` and shows the sheep and a diagnostics card to a respondent.
- **Operator-configured copy maps onto the anatomy.** Maintenance text arrives as separate env
  values, so `message` takes an array (`MAINTENANCE_CARD_DESCRIPTION`, `MAINTENANCE_BODY`) and
  the footer becomes the `note`. A value with no slot is deprecated rather than given one —
  `MAINTENANCE_BADGE_LABEL` is read by nothing.

## "Powered by Endatix"

The single Endatix mark on public pages: `Powered by **Endatix**` in the footer, linking to
endatix.com in a new tab.

- **Quiet by design.** `0.75rem`, subtle text colour, _Endatix_ one step stronger and underlined
  on hover. Below the content, never beside the title, never a logo.
- **On by default, off by config.** `ENDATIX_SHOW_POWERED_BY=false` hides it for a deployment
  (runtime — a `ClientEndatixConfig` field). The `showPoweredBy` prop may force it; do not use
  it to hide it on one page and show it on a sibling.
- **Tenant control comes with white-labelling**; until then there is one switch per deployment.
- **Only on `PublicStatusPage`.** Not inside a live survey, not in embed chrome around a form,
  not on Hub pages.
